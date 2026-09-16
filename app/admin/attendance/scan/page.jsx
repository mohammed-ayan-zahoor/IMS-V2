"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, UserCheck, ScanLine, UserX, XCircle, Search, AlertCircle } from "lucide-react";
import { toast } from "@/contexts/ToastContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

function ScannerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const batchId = searchParams.get("batchId");
    const isStaff = searchParams.get("staff") === "true";
    const date = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const batchName = searchParams.get("name") || "Batch";

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const faceapiRef = useRef(null);
    const faceMatcherRef = useRef(null);
    const animFrameRef = useRef(null);
    const isProcessingRef = useRef(false);
    const html5QrCodeRef = useRef(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [modelsReady, setModelsReady] = useState(false);
    const [profilesReady, setProfilesReady] = useState(false);
    const [enrolledUsers, setEnrolledUsers] = useState([]);
    const [markedIds, setMarkedIds] = useState(new Set());
    const [markedSlotsMap, setMarkedSlotsMap] = useState({}); // { [userId]: Set(['checkin', 'checkout']) }
    const [attendanceStatusMap, setAttendanceStatusMap] = useState({}); // { [userId]: { status: 'present'|'late'|'absent', method, time, slot } }
    const [filterTab, setFilterTab] = useState("all"); // 'all' | 'unmarked' | 'present' | 'absent'
    const [searchQuery, setSearchQuery] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [markedUsersList, setMarkedUsersList] = useState([]);
    const [lastMarked, setLastMarked] = useState(null);
    const [statusMsg, setStatusMsg] = useState("");

    const enrolledUsersRef = useRef(enrolledUsers);
    const handleRecognizedRef = useRef(null);

    useEffect(() => {
        enrolledUsersRef.current = enrolledUsers;
    }, [enrolledUsers]);

    // Institute attendance settings (mode, periodMode, working hours, grace period)
    const [attSettings, setAttSettings] = useState({
        mode: "checkin_only",
        periodMode: "daily",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        gracePeriodMinutes: 15
    });

    const [timetableSlots, setTimetableSlots] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch("/api/v1/institute");
                if (res.ok) {
                    const data = await res.json();
                    if (data.institute?.settings?.attendance) {
                        setAttSettings(prev => ({
                            ...prev,
                            ...data.institute.settings.attendance
                        }));
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch institute attendance settings:", err);
            }
        }
        fetchSettings();
    }, []);

    useEffect(() => {
        if (attSettings.periodMode === "per_period" && batchId && batchId !== "all") {
            fetch(`/api/v1/attendance/timetable?batchId=${batchId}`)
                .then(res => res.json())
                .then(data => {
                    const slots = data.slots || [];
                    setTimetableSlots(slots);
                    const currentSlot = slots.find(s => s.isCurrent) || slots[0];
                    if (currentSlot) setSelectedPeriodId(currentSlot._id);
                })
                .catch(err => console.warn("Failed to fetch timetable slots:", err));
        }
    }, [attSettings.periodMode, batchId]);

    // Calculate current slot ('checkin' vs 'checkout')
    const getCurrentSlot = useCallback(() => {
        if (attSettings.mode === "checkin_only") return "checkin";
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const parseMin = (tStr) => {
            if (!tStr) return 0;
            const [h, m] = tStr.split(":").map(Number);
            return (h || 0) * 60 + (m || 0);
        };
        const startMin = parseMin(attSettings.workingHoursStart || "08:00");
        const endMin = parseMin(attSettings.workingHoursEnd || "17:00");
        const midpoint = Math.floor((startMin + endMin) / 2);
        return currentMin >= midpoint ? "checkout" : "checkin";
    }, [attSettings]);


    // ── 1. Start camera immediately ───────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCameraReady(true);
            })
            .catch(err => { if (!cancelled) toast.error("Camera: " + err.message); });
        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    // ── 2. Load AI models in parallel ─────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setStatusMsg("Loading AI models…");
        import("@vladmandic/face-api").then(async faceapi => {
            faceapiRef.current = faceapi;
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            if (!cancelled) { setModelsReady(true); setStatusMsg(""); }
        }).catch(err => { if (!cancelled) { setStatusMsg("AI load failed: " + err.message); } });
        return () => { cancelled = true; };
    }, []);

    // ── 3. Fetch enrolled profiles in parallel ────────────────────────────
    useEffect(() => {
        const url = isStaff
            ? "/api/v1/attendance/descriptors?staff=true"
            : `/api/v1/attendance/descriptors?batchId=${batchId}`;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);

        fetch(url, { signal: ctrl.signal })
            .then(r => r.ok ? r.json() : { descriptors: [] })
            .then(data => {
                clearTimeout(timer);
                setEnrolledUsers(data.descriptors || []);
                setProfilesReady(true);
            })
            .catch(() => {
                clearTimeout(timer);
                setEnrolledUsers([]);
                setProfilesReady(true); // continue in QR-only mode
            });

        return () => { ctrl.abort(); clearTimeout(timer); };
    }, [batchId, isStaff]);

    // ── 3.5. Load already marked attendance on mount ──────────────────────────
    useEffect(() => {
        if (!profilesReady || enrolledUsers.length === 0) return;

        let active = true;
        async function loadExistingRecords() {
            try {
                if (isStaff) {
                    const res = await fetch(`/api/v1/hr/attendance?date=${date}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const list = [];
                    const ids = new Set();
                    const statusMap = {};
                    (data.records || []).forEach(r => {
                        if (r.status) {
                            const staffMember = r.staff;
                            if (staffMember) {
                                const sId = staffMember._id.toString();
                                const isAbs = r.status === "absent";
                                statusMap[sId] = {
                                    status: r.status,
                                    method: r.remarks?.includes("via") ? r.remarks.split("via")[1].trim() : (isAbs ? "Manual" : "Saved"),
                                    time: r.updatedAt ? format(new Date(r.updatedAt), "hh:mm a") : "08:00 AM"
                                };
                                if (!isAbs) {
                                    ids.add(sId);
                                    list.push({
                                        id: sId,
                                        name: `${staffMember.profile?.firstName || ""} ${staffMember.profile?.lastName || ""}`.trim() || staffMember.email,
                                        method: r.remarks?.includes("via") ? r.remarks.split("via")[1].trim() : "Saved",
                                        time: r.updatedAt ? format(new Date(r.updatedAt), "hh:mm a") : "08:00 AM",
                                        avatar: staffMember.profile?.avatar || null,
                                        enrollmentNumber: ""
                                    });
                                }
                            }
                        }
                    });
                    if (active) {
                        setMarkedIds(ids);
                        setAttendanceStatusMap(statusMap);
                        setMarkedUsersList(list);
                    }
                } else {
                    const res = await fetch(`/api/v1/attendance/batch?batchId=${batchId}&date=${date}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const list = [];
                    const ids = new Set();
                    const slotsMap = {};
                    const statusMap = {};
                    (data.records || []).forEach(r => {
                        if (r.status) {
                            const stu = r.student;
                            if (stu) {
                                const sId = (stu._id || stu).toString();
                                const slotName = r.slot || "checkin";
                                const isAbs = r.status === "absent";
                                statusMap[sId] = {
                                    status: r.status,
                                    method: `${r.method || (isAbs ? "Manual" : "Saved")} (${slotName})`,
                                    time: r.markedAt ? format(new Date(r.markedAt), "hh:mm a") : "Already Marked",
                                    slot: slotName
                                };
                                if (!isAbs) {
                                    ids.add(sId);
                                    if (!slotsMap[sId]) slotsMap[sId] = new Set();
                                    slotsMap[sId].add(slotName);

                                    list.push({
                                        id: sId,
                                        name: `${stu.profile?.firstName || ""} ${stu.profile?.lastName || ""}`.trim() || stu.email,
                                        method: `${r.method || "Saved"} (${slotName})`,
                                        time: r.markedAt ? format(new Date(r.markedAt), "hh:mm a") : "Already Marked",
                                        avatar: stu.profile?.avatar || null,
                                        enrollmentNumber: stu.enrollmentNumber || ""
                                    });
                                }
                            }
                        }
                    });
                    if (active) {
                        setMarkedIds(ids);
                        setMarkedSlotsMap(slotsMap);
                        setAttendanceStatusMap(statusMap);
                        setMarkedUsersList(list);
                    }
                }
            } catch (err) {
                console.warn("Failed to load today's marked attendance:", err);
            }
        }

        loadExistingRecords();
        return () => { active = false; };
    }, [profilesReady, enrolledUsers, batchId, date, isStaff]);

    // ── 4. Build face matcher once models + profiles are both ready ────────
    useEffect(() => {
        if (!modelsReady || !profilesReady || !faceapiRef.current) return;
        const faceapi = faceapiRef.current;
        const labeled = enrolledUsers
            .filter(u => u.faceDescriptor?.length === 128)
            .map(u => new faceapi.LabeledFaceDescriptors(u.id, [new Float32Array(u.faceDescriptor)]));
        faceMatcherRef.current = labeled.length > 0 ? new faceapi.FaceMatcher(labeled, 0.55) : null;
    }, [modelsReady, profilesReady, enrolledUsers]);

    // ── 4.5. Start QR code scanner once camera + profiles are ready ──────────
    useEffect(() => {
        if (!cameraReady || !profilesReady) return;
        let cancelled = false;
        let html5Qr = null;

        import("html5-qrcode").then(({ Html5Qrcode }) => {
            if (cancelled) return;
            try {
                html5Qr = new Html5Qrcode("qr-reader-hidden");
                html5QrCodeRef.current = html5Qr;
                html5Qr.start(
                    { facingMode: "user" },
                    { fps: 5, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        const str = decodedText.trim();
                        let matchedUser = null;
                        const currentUsers = enrolledUsersRef.current || [];
                        if (str.startsWith("STU:")) {
                            const enrollment = str.replace("STU:", "").trim();
                            matchedUser = currentUsers.find(u => u.enrollmentNumber === enrollment || u.id === enrollment);
                        } else if (str.startsWith("STAFF:")) {
                            const staffId = str.replace("STAFF:", "").trim();
                            matchedUser = currentUsers.find(u => u.id === staffId || u.email === staffId);
                        } else {
                            matchedUser = currentUsers.find(u => u.id === str || u.enrollmentNumber === str);
                        }
                        if (matchedUser) {
                            handleRecognizedRef.current?.(matchedUser, "QR Code");
                        } else {
                            toast.error("QR Code scanned, but student not in this batch.");
                        }
                    },
                    () => {}
                ).catch(err => console.warn("QR Scanner Start Warning:", err));
            } catch (e) {
                console.warn("QR Reader Init warning:", e);
            }
        });

        return () => {
            cancelled = true;
            if (html5Qr) {
                html5Qr.stop().catch(() => {});
                html5QrCodeRef.current = null;
            }
        };
    }, [cameraReady, profilesReady]);

    // ── 5. Start face detection loop once camera + models ready ───────────
    useEffect(() => {
        if (!cameraReady || !modelsReady) return;
        let alive = true;

        const tick = async () => {
            if (!alive || !videoRef.current || !faceMatcherRef.current || isProcessingRef.current) {
                if (alive) animFrameRef.current = requestAnimationFrame(tick);
                return;
            }
            if (videoRef.current.readyState === 4) {
                try {
                    const dets = await faceapiRef.current
                        .detectAllFaces(videoRef.current)
                        .withFaceLandmarks()
                        .withFaceDescriptors();
                    if (dets?.length > 0) {
                        for (const det of dets) {
                            const match = faceMatcherRef.current.findBestMatch(det.descriptor);
                            if (match?.label !== "unknown") {
                                const user = enrolledUsersRef.current.find(u => u.id === match.label);
                                if (user) { handleRecognizedRef.current?.(user, "Face AI"); break; }
                            }
                        }
                    }
                } catch (_) {}
            }
            if (alive) setTimeout(() => { animFrameRef.current = requestAnimationFrame(tick); }, 300);
        };

        animFrameRef.current = requestAnimationFrame(tick);
        return () => { alive = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraReady, modelsReady]);

    // ── Mark attendance ────────────────────────────────────────────────────
    const handleRecognized = useCallback(async (user, method) => {
        const slot = getCurrentSlot();
        const userSlots = markedSlotsMap[user.id] || new Set();
        const currentStatus = attendanceStatusMap[user.id]?.status;
        if (isProcessingRef.current || (userSlots.has(slot) && currentStatus !== "absent")) return;
        isProcessingRef.current = true;

        try {
            if (isStaff) {
                const postRes = await fetch("/api/v1/hr/attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date,
                        records: [{
                            staffId: user.id,
                            status: "present",
                            remarks: `Auto-marked via ${method}`
                        }]
                    })
                });
                if (!postRes.ok) {
                    const errData = await postRes.json();
                    throw new Error(errData.error || "Save failed");
                }
            } else {
                const targetBatchId = user.batchId || batchId;
                if (!targetBatchId || targetBatchId === "all") {
                    toast.error(`${user.name} is not enrolled in any active class/batch.`);
                    isProcessingRef.current = false;
                    return;
                }

                // Determine if late check-in based on working hours + grace period
                let status = "present";
                if (slot === "checkin" && attSettings.workingHoursStart) {
                    const now = new Date();
                    const curMin = now.getHours() * 60 + now.getMinutes();
                    const [h, m] = attSettings.workingHoursStart.split(":").map(Number);
                    const startMin = (h || 0) * 60 + (m || 0);
                    const grace = attSettings.gracePeriodMinutes || 15;
                    if (curMin > startMin + grace) {
                        status = "late";
                    }
                }

                // Active period details
                const activePeriod = timetableSlots.find(s => s._id === selectedPeriodId);

                const postRes = await fetch("/api/v1/attendance/batch/single", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        batchId: targetBatchId,
                        date,
                        studentId: user.id,
                        status,
                        slot,
                        method: method === "QR Code" ? "qr" : "face",
                        periodId: activePeriod ? activePeriod._id : null,
                        periodName: activePeriod ? activePeriod.name : "",
                        remarks: `Auto via ${method}${activePeriod ? ` (${activePeriod.name})` : ""}`
                    })
                });

                if (!postRes.ok) {
                    const errData = await postRes.json();
                    throw new Error(errData.error || "Save failed");
                }
            }

            setAttendanceStatusMap(prev => ({
                ...prev,
                [user.id]: {
                    status: "present",
                    method: `${method} (${slot === "checkout" ? "Check-Out" : "Check-In"})`,
                    time: format(new Date(), "hh:mm a"),
                    slot
                }
            }));

            setMarkedSlotsMap(prev => {
                const updated = { ...prev };
                const currentSet = new Set(updated[user.id] || []);
                currentSet.add(slot);
                updated[user.id] = currentSet;
                return updated;
            });
            setMarkedIds(prev => new Set([...prev, user.id]));

            const activePeriod = timetableSlots.find(s => s._id === selectedPeriodId);
            const periodTag = activePeriod ? ` - ${activePeriod.name}` : "";

            const newRecord = {
                id: user.id,
                name: user.name,
                method: `${method} (${slot === "checkout" ? "Check-Out" : "Check-In"}${periodTag})`,
                time: format(new Date(), "hh:mm a"),
                avatar: user.avatar,
                enrollmentNumber: user.enrollmentNumber || ""
            };
            setMarkedUsersList(prev => [newRecord, ...prev]);
            setLastMarked(newRecord);
            toast.success(`✓ ${user.name} marked ${slot === "checkout" ? "Check-Out" : "Check-In"}${periodTag}`);
        } catch (err) {
            toast.error("Mark failed: " + err.message);
        } finally {
            setTimeout(() => { isProcessingRef.current = false; }, 1500);
        }
    }, [markedSlotsMap, batchId, date, isStaff, getCurrentSlot, attSettings, timetableSlots, selectedPeriodId, attendanceStatusMap]);
    handleRecognizedRef.current = handleRecognized;

    const handleManualMark = async (user, newStatus) => {
        const slot = getCurrentSlot();
        const activePeriod = timetableSlots.find(s => s._id === selectedPeriodId);
        const targetBatchId = user.batchId || batchId;

        try {
            if (isStaff) {
                const res = await fetch("/api/v1/hr/attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date,
                        records: [{
                            staffId: user.id,
                            status: newStatus,
                            remarks: `Manual (${newStatus})`
                        }]
                    })
                });
                if (!res.ok) throw new Error("Failed to update staff attendance");
            } else {
                if (!targetBatchId || targetBatchId === "all") {
                    toast.error(`${user.name} is not enrolled in any active batch.`);
                    return;
                }
                const res = await fetch("/api/v1/attendance/batch/single", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        batchId: targetBatchId,
                        date,
                        studentId: user.id,
                        status: newStatus,
                        slot,
                        method: "manual",
                        periodId: activePeriod ? activePeriod._id : null,
                        periodName: activePeriod ? activePeriod.name : "",
                        remarks: `Manual (${newStatus})`
                    })
                });
                if (!res.ok) throw new Error("Failed to update student attendance");
            }

            const timeStr = format(new Date(), "hh:mm a");
            setAttendanceStatusMap(prev => ({
                ...prev,
                [user.id]: {
                    status: newStatus,
                    method: "Manual",
                    time: timeStr,
                    slot
                }
            }));

            if (newStatus === "absent") {
                setMarkedSlotsMap(prev => {
                    const updated = { ...prev };
                    if (updated[user.id]) {
                        const s = new Set(updated[user.id]);
                        s.delete(slot);
                        updated[user.id] = s;
                    }
                    return updated;
                });
                setMarkedIds(prev => {
                    const next = new Set(prev);
                    next.delete(user.id);
                    return next;
                });
                toast.info(`Marked ${user.name} as Absent`);
            } else {
                setMarkedSlotsMap(prev => {
                    const updated = { ...prev };
                    const currentSet = new Set(updated[user.id] || []);
                    currentSet.add(slot);
                    updated[user.id] = currentSet;
                    return updated;
                });
                setMarkedIds(prev => new Set([...prev, user.id]));
                toast.success(`Marked ${user.name} as Present`);
            }
        } catch (err) {
            toast.error("Mark failed: " + err.message);
        }
    };

    const handleMarkRemainingAbsent = async () => {
        const unmarkedUsers = enrolledUsers.filter(u => {
            const s = attendanceStatusMap[u.id]?.status;
            return s !== "present" && s !== "late" && s !== "absent";
        });

        if (unmarkedUsers.length === 0) {
            toast.info("No unmarked students remaining.");
            return;
        }

        setBulkLoading(true);
        const slot = getCurrentSlot();
        const activePeriod = timetableSlots.find(s => s._id === selectedPeriodId);

        try {
            if (isStaff) {
                const records = unmarkedUsers.map(u => ({
                    staffId: u.id,
                    status: "absent",
                    remarks: "Auto-marked Absent (did not scan)"
                }));
                const res = await fetch("/api/v1/hr/attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date, records })
                });
                if (!res.ok) throw new Error("Failed to save staff attendance");
            } else {
                const byBatch = {};
                unmarkedUsers.forEach(u => {
                    const bId = u.batchId || batchId;
                    if (bId && bId !== "all") {
                        if (!byBatch[bId]) byBatch[bId] = [];
                        byBatch[bId].push(u.id);
                    }
                });

                const batchKeys = Object.keys(byBatch);
                if (batchKeys.length === 0) {
                    toast.error("No valid batch found for unmarked students.");
                    setBulkLoading(false);
                    return;
                }

                for (const bId of batchKeys) {
                    const studentIds = byBatch[bId];
                    const res = await fetch("/api/v1/attendance/batch/single", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            batchId: bId,
                            date,
                            studentIds,
                            status: "absent",
                            slot,
                            method: "manual",
                            periodId: activePeriod ? activePeriod._id : null,
                            periodName: activePeriod ? activePeriod.name : "",
                            remarks: "Auto-marked Absent (did not scan)"
                        })
                    });
                    if (!res.ok) throw new Error("Failed to update batch attendance");
                }
            }

            const updatedStatus = { ...attendanceStatusMap };
            const timeNow = format(new Date(), "hh:mm a");
            unmarkedUsers.forEach(u => {
                updatedStatus[u.id] = {
                    status: "absent",
                    method: "Batch (Absent)",
                    time: timeNow,
                    slot
                };
            });
            setAttendanceStatusMap(updatedStatus);

            toast.success(`Marked ${unmarkedUsers.length} student(s) as Absent`);
        } catch (err) {
            toast.error("Failed to mark absent: " + err.message);
        } finally {
            setBulkLoading(false);
        }
    };

    const presentCount = enrolledUsers.filter(u => {
        const s = attendanceStatusMap[u.id]?.status;
        return s === "present" || s === "late";
    }).length;

    const absentCount = enrolledUsers.filter(u => {
        return attendanceStatusMap[u.id]?.status === "absent";
    }).length;

    const unmarkedCount = enrolledUsers.filter(u => {
        const s = attendanceStatusMap[u.id]?.status;
        return s !== "present" && s !== "late" && s !== "absent";
    }).length;

    const displayedUsers = enrolledUsers.filter(u => {
        const record = attendanceStatusMap[u.id];
        const s = record?.status;
        const isPresent = s === "present" || s === "late";
        const isAbsent = s === "absent";
        const isUnmarked = !s || (s !== "present" && s !== "late" && s !== "absent");

        if (filterTab === "present" && !isPresent) return false;
        if (filterTab === "absent" && !isAbsent) return false;
        if (filterTab === "unmarked" && !isUnmarked) return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = (u.name || "").toLowerCase().includes(q);
            const idMatch = (u.enrollmentNumber || "").toLowerCase().includes(q);
            return nameMatch || idMatch;
        }
        return true;
    });

    const ready = cameraReady && modelsReady && profilesReady;
    const faceCount = enrolledUsers.filter(u => u.faceDescriptor?.length === 128).length;

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-10 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="text-center flex flex-wrap items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <ScanLine size={16} className="text-indigo-600" />
                            {isStaff ? "Staff Scanner" : `Scanner: ${batchName}`}
                        </div>
                        <p className="text-xs text-slate-500">{date}</p>
                    </div>

                    <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border ${
                        getCurrentSlot() === "checkout"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                        ● {getCurrentSlot() === "checkout" ? "Check-Out Mode" : "Check-In Mode"}
                    </span>

                    {attSettings.periodMode === "per_period" && timetableSlots.length > 0 && (
                        <select
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                            className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {timetableSlots.map(s => (
                                <option key={s._id} value={s._id}>
                                    {s.name} ({s.startTime}-{s.endTime}){s.isCurrent ? " - Current" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck size={13} />
                        {presentCount} Present
                    </span>
                    {absentCount > 0 && (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <UserX size={13} />
                            {absentCount} Absent
                        </span>
                    )}
                </div>
            </div>

            {/* Hidden container required for html5-qrcode */}
            <div id="qr-reader-hidden" className="hidden"></div>

            {/* Split Screen Layout Container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                {/* Left Side: Camera Viewport */}
                <div className="bg-black relative flex items-center justify-center overflow-hidden min-h-0 h-[50vh] md:h-full flex-1">
                    {!cameraReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                            <p className="text-white text-sm">Starting camera…</p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay muted playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)", maxHeight: "100%" }}
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                    {/* Face guide box */}
                    {cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="border-2 border-dashed border-indigo-400 opacity-50 rounded-2xl animate-pulse"
                                style={{ width: "50%", height: "70%" }} />
                        </div>
                    )}

                    {/* Last recognized banner */}
                    {lastMarked && (
                        <div className="absolute bottom-4 left-4 right-4 bg-emerald-600 text-white rounded-xl p-3 shadow-lg flex items-center gap-3 z-10">
                            {lastMarked.avatar
                                ? <img src={lastMarked.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                                : <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold border-2 border-white">{lastMarked.name[0]}</div>
                            }
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{lastMarked.name}</p>
                                <p className="text-xs text-emerald-100">{lastMarked.method} · {lastMarked.time}</p>
                            </div>
                            <CheckCircle2 className="w-6 h-6 shrink-0" />
                        </div>
                    )}
                </div>

                {/* Right Side: Roster & Attendance Sidebar */}
                <div className="w-full md:w-84 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden min-h-0 h-[40vh] md:h-full">
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Roster Attendance</span>
                                <p className="text-[11px] text-slate-400">{enrolledUsers.length} enrolled</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                    {presentCount} P
                                </span>
                                <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                    {absentCount} A
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                    {unmarkedCount} Left
                                </span>
                            </div>
                        </div>

                        {/* Quick Bulk Action: Mark Remaining as Absent */}
                        {unmarkedCount > 0 && (
                            <button
                                onClick={handleMarkRemainingAbsent}
                                disabled={bulkLoading}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                                {bulkLoading ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <UserX size={13} />
                                )}
                                <span>Mark Remaining as Absent ({unmarkedCount})</span>
                            </button>
                        )}

                        {/* Search Input & Filter Tabs */}
                        <div className="space-y-1.5 pt-0.5">
                            <div className="relative">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or ID..."
                                    className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                                {[
                                    { key: "all", label: `All (${enrolledUsers.length})` },
                                    { key: "unmarked", label: `Unmarked (${unmarkedCount})` },
                                    { key: "present", label: `Present (${presentCount})` },
                                    { key: "absent", label: `Absent (${absentCount})` },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setFilterTab(tab.key)}
                                        className={cn(
                                            "flex-1 py-1 text-center rounded-md transition-all",
                                            filterTab === tab.key
                                                ? "bg-white text-slate-800 shadow-xs font-black"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Student list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                        {displayedUsers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                                <UserCheck className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs font-semibold text-slate-600">No students in this view</p>
                            </div>
                        ) : (
                            displayedUsers.map(u => {
                                const record = attendanceStatusMap[u.id];
                                const status = record?.status;
                                const isPresent = status === "present" || status === "late";
                                const isAbsent = status === "absent";
                                const isUnmarked = !status;

                                return (
                                    <div
                                        key={u.id}
                                        className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all",
                                            isPresent
                                                ? "bg-emerald-50/40 border-emerald-200/70"
                                                : isAbsent
                                                ? "bg-rose-50/40 border-rose-200/70"
                                                : "bg-white border-slate-200/70 hover:border-slate-300"
                                        )}
                                    >
                                        {u.avatar ? (
                                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                        ) : (
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                                                isPresent
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : isAbsent
                                                    ? "bg-rose-100 text-rose-800 border-rose-200"
                                                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                            )}>
                                                {u.name[0]}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-bold text-slate-800 text-xs truncate">{u.name}</p>
                                                {status === "late" && (
                                                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                        Late
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-[10px] truncate">
                                                {u.enrollmentNumber ? `ID: ${u.enrollmentNumber} · ` : ''}
                                                {record ? `${record.method || 'Marked'} (${record.time})` : 'Awaiting recognition'}
                                            </p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isUnmarked && (
                                                <>
                                                    <button
                                                        onClick={() => handleManualMark(u, "absent")}
                                                        title="Mark Absent"
                                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                                    >
                                                        Absent
                                                    </button>
                                                    <button
                                                        onClick={() => handleManualMark(u, "present")}
                                                        title="Mark Present"
                                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                                    >
                                                        Present
                                                    </button>
                                                </>
                                            )}
                                            {isAbsent && (
                                                <button
                                                    onClick={() => handleManualMark(u, "present")}
                                                    title="Change to Present"
                                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span className="text-rose-600 font-extrabold mr-1">✗ Absent</span>
                                                    <span>→ Present</span>
                                                </button>
                                            )}
                                            {isPresent && (
                                                <button
                                                    onClick={() => handleManualMark(u, "absent")}
                                                    title="Change to Absent"
                                                    className="px-2 py-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span className="text-emerald-600 font-extrabold mr-1">✓ Present</span>
                                                    <span className="text-slate-400">→ Absent</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div className="bg-white px-4 py-3 border-t border-slate-200 z-10 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className={`flex items-center gap-1 ${cameraReady ? "text-emerald-600" : "text-amber-600"}`}>
                            {cameraReady ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                            Camera
                        </span>
                        <span className={`flex items-center gap-1 ${modelsReady ? "text-emerald-600" : "text-amber-600"}`}>
                            {modelsReady ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                            AI Models
                        </span>
                        <span className={`flex items-center gap-1 ${profilesReady ? "text-emerald-600" : "text-amber-600"}`}>
                            {profilesReady ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                            {profilesReady ? `${faceCount} enrolled` : "Profiles"}
                        </span>
                    </div>
                    {ready && (
                        <span className="text-xs text-indigo-600 font-bold animate-pulse">● Scanning…</span>
                    )}
                </div>
                {statusMsg && <p className="text-xs text-amber-600 mt-1">{statusMsg}</p>}
            </div>
        </div>
    );
}

export default function AttendanceScanPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
            <ScannerPage />
        </Suspense>
    );
}
