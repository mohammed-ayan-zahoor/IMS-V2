"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, UserCheck, ScanLine } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

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
    const [markedUsersList, setMarkedUsersList] = useState([]);
    const [lastMarked, setLastMarked] = useState(null);
    const [statusMsg, setStatusMsg] = useState("");

    const enrolledUsersRef = useRef(enrolledUsers);
    const handleRecognizedRef = useRef(null);

    useEffect(() => {
        enrolledUsersRef.current = enrolledUsers;
    }, [enrolledUsers]);

    const [useTimeRange, setUseTimeRange] = useState(true);
    const [checkInStart, setCheckInStart] = useState("08:00");
    const [checkInEnd, setCheckInEnd] = useState("11:00");
    const [checkOutStart, setCheckOutStart] = useState("15:00");
    const [checkOutEnd, setCheckOutEnd] = useState("18:00");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedRange = localStorage.getItem("useTimeRange");
            if (savedRange !== null) setUseTimeRange(savedRange === "true");
            const cis = localStorage.getItem("checkInStart");
            if (cis) setCheckInStart(cis);
            const cie = localStorage.getItem("checkInEnd");
            if (cie) setCheckInEnd(cie);
            const cos = localStorage.getItem("checkOutStart");
            if (cos) setCheckOutStart(cos);
            const coe = localStorage.getItem("checkOutEnd");
            if (coe) setCheckOutEnd(coe);
        }
    }, []);


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
                    (data.records || []).forEach(r => {
                        if (r.status && r.status !== "absent") {
                            const staffMember = r.staff;
                            if (staffMember) {
                                ids.add(staffMember._id.toString());
                                list.push({
                                    id: staffMember._id.toString(),
                                    name: `${staffMember.profile?.firstName || ""} ${staffMember.profile?.lastName || ""}`.trim() || staffMember.email,
                                    method: r.remarks?.includes("via") ? r.remarks.split("via")[1].trim() : "Saved",
                                    time: r.updatedAt ? format(new Date(r.updatedAt), "hh:mm a") : "08:00 AM",
                                    avatar: staffMember.profile?.avatar || null,
                                    enrollmentNumber: ""
                                });
                            }
                        }
                    });
                    if (active) {
                        setMarkedIds(ids);
                        setMarkedUsersList(list);
                    }
                } else {
                    const res = await fetch(`/api/v1/attendance/batch?batchId=${batchId}&date=${date}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const list = [];
                    const ids = new Set();
                    (data.records || []).forEach(r => {
                        if (r.status === "present") {
                            const stu = r.student;
                            if (stu) {
                                ids.add(stu._id.toString());
                                list.push({
                                    id: stu._id.toString(),
                                    name: `${stu.profile?.firstName || ""} ${stu.profile?.lastName || ""}`.trim() || stu.email,
                                    method: r.remarks?.includes("via") ? r.remarks.split("via")[1].trim() : "Saved",
                                    time: "Already Marked",
                                    avatar: stu.profile?.avatar || null,
                                    enrollmentNumber: stu.enrollmentNumber || ""
                                });
                            }
                        }
                    });
                    if (active) {
                        setMarkedIds(ids);
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
        if (isProcessingRef.current || markedIds.has(user.id)) return;
        isProcessingRef.current = true;

        // Apply shift time constraints for staff members
        if (isStaff && useTimeRange) {
            const now = new Date();
            const curMin = now.getHours() * 60 + now.getMinutes();
            const parseToMin = (t) => {
                const [h, m] = t.split(":").map(Number);
                return h * 60 + m;
            };
            const inCheckIn = curMin >= parseToMin(checkInStart) && curMin <= parseToMin(checkInEnd);
            const inCheckOut = curMin >= parseToMin(checkOutStart) && curMin <= parseToMin(checkOutEnd);

            if (!inCheckIn && !inCheckOut) {
                toast.error(`Scan blocked: Outside shift hours (${checkInStart}-${checkInEnd} / ${checkOutStart}-${checkOutEnd}).`);
                isProcessingRef.current = false;
                return;
            }
        }

        try {
            if (isStaff) {
                // Post staff attendance record in correct bulk format
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

                const fetchRes = await fetch(`/api/v1/attendance/batch?batchId=${targetBatchId}&date=${date}`);
                const current = await fetchRes.json();
                const recordsMap = new Map();
                (current.records || []).forEach(r => {
                    const sid = r.student?._id || r.student;
                    if (sid) recordsMap.set(sid.toString(), r);
                });
                recordsMap.set(user.id, { student: user.id, status: "present", remarks: `Auto via ${method}` });
                const payloadRecords = Array.from(recordsMap.values()).map(r => ({
                    studentId: r.student?._id || r.student,
                    status: r.status,
                    remarks: r.remarks || ""
                }));
                const postRes = await fetch("/api/v1/attendance/batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ batchId: targetBatchId, date, records: payloadRecords })
                });
                if (!postRes.ok) {
                    const errData = await postRes.json();
                    throw new Error(errData.error || "Save failed");
                }
            }

            setMarkedIds(prev => new Set([...prev, user.id]));
            const newRecord = {
                id: user.id,
                name: user.name,
                method,
                time: format(new Date(), "hh:mm a"),
                avatar: user.avatar,
                enrollmentNumber: user.enrollmentNumber || ""
            };
            setMarkedUsersList(prev => [newRecord, ...prev]);
            setLastMarked(newRecord);
            toast.success(`✓ ${user.name} marked present`);
        } catch (err) {
            toast.error("Mark failed: " + err.message);
        } finally {
            setTimeout(() => { isProcessingRef.current = false; }, 1500);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markedIds, batchId, date, isStaff, useTimeRange, checkInStart, checkInEnd, checkOutStart, checkOutEnd]);
    handleRecognizedRef.current = handleRecognized;

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
                <div className="text-center">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <ScanLine size={16} className="text-indigo-600" />
                        {isStaff ? "Staff Scanner" : `Scanner: ${batchName}`}
                    </div>
                    <p className="text-xs text-slate-500">{date}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <UserCheck size={14} />
                    {markedIds.size} marked
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

                {/* Right Side: Marked Students Sidebar */}
                <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden min-h-0 h-[40vh] md:h-full">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Marked Attendance</span>
                        <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                            {markedIds.size} present
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                        {markedUsersList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                                <UserCheck className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                                <p className="text-sm font-semibold text-slate-600">No students marked yet</p>
                                <p className="text-xs text-slate-400 mt-1">Present face or scan QR card to begin</p>
                            </div>
                        ) : (
                            markedUsersList.map(u => (
                                <div key={u.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 hover:border-slate-350 hover:shadow-xs transition-all">
                                    {u.avatar ? (
                                        <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
                                            {u.name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-700 text-sm truncate">{u.name}</p>
                                        <p className="text-slate-500 text-xs truncate">
                                            {u.enrollmentNumber ? `ID: ${u.enrollmentNumber} · ` : ''}{u.time}
                                        </p>
                                    </div>
                                    <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {u.method}
                                    </span>
                                </div>
                            ))
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
