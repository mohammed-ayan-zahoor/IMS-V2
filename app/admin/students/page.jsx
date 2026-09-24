"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    MoreVertical,
    Edit2,
    Trash2,
    UserPlus,
    Mail,
    Phone,
    Fingerprint,
    Users,
    Printer,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    X,
    Upload,
    MessageSquare,
    Bus,
    MapPin,
    Car,
    CreditCard,
    GraduationCap,
    Image as ImageIcon,
    FolderCheck,
    Download,
    Check
} from "lucide-react";
import { processImageFolder, findMatchingPhoto, compressAndUploadPhotos } from "@/lib/photoMatcher";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import { useSession } from "next-auth/react";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";

export default function StudentsPage() {
    const toast = useToast();
    const { data: session } = useSession();
    const isVocational = session?.user?.institute?.type === 'VOCATIONAL';
    const isCollege = session?.user?.institute?.type === 'COLLEGE';
    const isSchool = session?.user?.institute?.type === 'SCHOOL' || (!isVocational && !isCollege && session?.user?.institute?.code === 'QUANTECH');
    const [courseBundles, setCourseBundles] = useState([]);
    const [transportRoutes, setTransportRoutes] = useState([]);
    const [transportVehicles, setTransportVehicles] = useState([]);
    const [transportPresets, setTransportPresets] = useState([]);
    const [transportLoading, setTransportLoading] = useState(false);

    const isTransportEnabled = session?.user?.institute?.type === 'SCHOOL' || session?.user?.institute?.features?.transport;
    const isRteEnabled = !!session?.user?.institute?.features?.rteAndScholarship;
    const isHostelEnabled = !!session?.user?.institute?.features?.hostel;
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
     const [selectedStudents, setSelectedStudents] = useState(new Set());
     const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
     const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
     const [isDeleting, setIsDeleting] = useState(false);
     const { selectedSessionId, sessions } = useAcademicSession();

    // Fee Preset Apply State
    const [isFeePresetModalOpen, setIsFeePresetModalOpen] = useState(false);
    const [feePresets, setFeePresets] = useState([]);
    const [feePresetApply, setFeePresetApply] = useState({ batchId: "", presetId: "", numInstallments: 1 });
    const [isApplyingPreset, setIsApplyingPreset] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auto-open modal if ?add=true is present
    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            setIsAddModalOpen(true);
            // Optional: clean up the URL to prevent re-opening on refresh
            // router.replace('/admin/students', { scroll: false });
        }
    }, [searchParams]);

    // Import Logic State
    const [importFile, setImportFile] = useState(null);
    const [importCourseId, setImportCourseId] = useState("");
    const [importBatchId, setImportBatchId] = useState("");
    const [importStatus, setImportStatus] = useState("idle"); // idle, uploading, preview, uploading_photos, importing, success, error
    const [importResult, setImportResult] = useState(null); // { successCount, failedCount, errors }
    const [photoMap, setPhotoMap] = useState(new Map());
    const [photoFilesCount, setPhotoFilesCount] = useState(0);
    const [matchedPhotos, setMatchedPhotos] = useState({}); // { [rowIdx]: File }
    const [photoUploadProgress, setPhotoUploadProgress] = useState(null); // { completed, total, percent }
    const [importTab, setImportTab] = useState("new_students"); // "new_students" | "existing_photos"
    const [photoCourseId, setPhotoCourseId] = useState("");
    const [photoBatchId, setPhotoBatchId] = useState("");
    const [photoStudents, setPhotoStudents] = useState([]);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoStatus, setPhotoStatus] = useState("idle"); // idle, uploading_photos, updating_db, success, error
    const [matchedExistingPhotos, setMatchedExistingPhotos] = useState({}); // { [studentId]: File }
    const [photoUpdateResult, setPhotoUpdateResult] = useState(null);

    // Filter State
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [filters, setFilters] = useState({
        batchId: "",
        courseId: "",
        instituteId: "", // Add instituteId
        isActive: "true"
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

const getInitialFormData = (selectedSessionId = "") => ({
    email: "",
    password: "",
    institute: "",
    profile: {
        firstName: "",
        lastName: "",
        phone: "",
        avatar: "",
        gender: "",
        dateOfBirth: "",
        bloodGroup: "",
        address: {
            street: "",
            city: "",
            state: "",
            pincode: ""
        }
    },
    // Identity & Family Metadata
    grNumber: "",
    aadharNumber: "",
    studentIdUdise: "",
    apaarId: "",
    penNumber: "",
    fatherName: "",
    fatherPhone: "",
    fatherAadhar: "",
    motherName: "",
    motherPhone: "",
    motherAadhar: "",
    // Academic History
    lastSchoolAttended: "",
    admissionDate: format(new Date(), "yyyy-MM-dd"),
    admissionStd: "",
    admissionBatch: "",
    sessionId: selectedSessionId || "",
    // Demographic fields
    nationality: "Indian",
    motherTongue: "",
    religion: "",
    caste: "",
    subCaste: "",
    referredBy: "",
    
    // Birth details
    placeOfBirth: {
        city: "",
        taluka: "",
        district: "",
        state: "",
        country: "India"
    },
    transport: {
        isAvailing: false,
        route: "",
        vehicle: "",
        pickupStop: "",
        preset: "",
        maxCycles: ""
    },
    rte: {
        isRte: false,
        rteDocumentUrl: "",
        rteDetails: ""
    },
    scholarship: {
        hasScholarship: false,
        scholarshipName: "",
        scholarshipAmount: 0,
        scholarshipType: "flat"
    }
});

    const [formData, setFormData] = useState(() => getInitialFormData(selectedSessionId));

    const isFirstRender = useRef(true);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        fetchInitialData();
        if (isTransportEnabled) {
            fetchTransportData();
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [isTransportEnabled]);

    const fetchTransportData = async () => {
        try {
            const [rRes, vRes, pRes] = await Promise.all([
                fetch("/api/v1/transport/routes"),
                fetch("/api/v1/transport/vehicles"),
                fetch("/api/v1/transport/fee-presets")
            ]);
            const [rData, vData, pData] = await Promise.all([rRes.json(), vRes.json(), pRes.json()]);
            setTransportRoutes(rData.routes || []);
            setTransportVehicles(vData.vehicles || []);
            setTransportPresets(pData.presets || []);
        } catch (error) {
            console.error("Failed to fetch transport data:", error);
        }
    };

    useEffect(() => {
        if (session?.user?.role === 'super_admin') {
            fetchInstitutes();
        }
    }, [session]);

    const fetchInstitutes = async () => {
        try {
            const res = await fetch("/api/v1/institutes");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        }
    };



    const fetchInitialData = async () => {
        try {
            const fetches = [
                fetch("/api/v1/batches"),
                fetch("/api/v1/courses")
            ];
            if (!isSchool) fetches.push(fetch("/api/v1/course-bundles"));

            const [bRes, cRes, bundleRes] = await Promise.all(fetches);
            if (bRes && bRes.ok) {
                const bData = await bRes.json();
                setBatches(bData.batches || []);
            }
            if (cRes && cRes.ok) {
                const cData = await cRes.json();
                setCourses(cData.courses || []);
            }
            if (bundleRes && bundleRes.ok) {
                const bundleData = await bundleRes.json();
                setCourseBundles(bundleData.bundles || []);
            }

            // Try fetching institutes (only for Super Admin)
            const iRes = await fetch("/api/v1/institutes");
            if (iRes.ok) {
                const iData = await iRes.json();
                setInstitutes(iData.institutes || []);
            }
        } catch (error) {
            console.error("Failed to fetch filter data", error);
        }
    };

    const fetchStudents = async (page = pagination.page, customLimit = pagination.limit) => {
        // Cancellation logic
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                search,
                batchId: filters.batchId,
                courseId: filters.courseId,
                instituteId: filters.instituteId, // Include in API call
                isActive: filters.isActive,
                page: page.toString(),
                limit: customLimit.toString()
            });

            const res = await fetch(`/api/v1/students?${queryParams.toString()}`, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'x-session-id': selectedSessionId || ''
                },
                cache: 'no-store'
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch students: ${res.status}`);
            }
            const data = await res.json();
            setStudents(data.students || []);
            if (data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination.page,
                    total: data.pagination.total,
                    pages: data.pagination.pages
                }));
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Failed to fetch students", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        try {
            const queryParams = new URLSearchParams({
                search,
                batchId: filters.batchId,
                courseId: filters.courseId,
                instituteId: filters.instituteId,
                isActive: filters.isActive,
                page: '1',
                limit: '1000' // Get all for print
            });

            const res = await fetch(`/api/v1/students?${queryParams.toString()}`, {
                headers: {
                    'x-session-id': selectedSessionId || ''
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch students for print: ${res.status}`);
            }
            const data = await res.json();
            const printStudents = data.students || [];
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                // XSS Protection Helper
                const escapeHtml = (unsafe) => {
                    if (unsafe === null || unsafe === undefined) return "";
                    return String(unsafe)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                };

                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Student List</title>
                      <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1e293b; }
                        h1 { font-size: 20px; font-weight: 800; margin-bottom: 5px; color: #0f172a; }
                        p.meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th { text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
                        td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .status-active { color: #16a34a; font-weight: 600; }
                        .status-inactive { color: #dc2626; font-weight: 600; }
                        @media print {
                          @page { margin: 1cm; }
                          body { -webkit-print-color-adjust: exact; }
                        }
                      </style>
                    </head>
                    <body>
                      <h1>Student List</h1>
                      <p class="meta">Generated: ${escapeHtml(format(new Date(), "PPpp"))} | showing ${printStudents.length} records</p>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Enrollment ID</th>
                            <th>Contact</th>
                            <th>Email</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${printStudents.map((s, i) => `
                            <tr>
                              <td style="color:#94a3b8;">${i + 1}</td>
                              <td style="font-weight:600;">${escapeHtml(s.fullName)}</td>
                              <td style="font-family:monospace; color:#475569;">${escapeHtml(s.enrollmentNumber || 'PENDING')}</td>
                              <td>${escapeHtml(s.profile?.phone || '-')}</td>
                              <td>${escapeHtml(s.email)}</td>
                              <td class="${s.isActive ? 'status-active' : 'status-inactive'}">${s.isActive ? 'Active' : 'Inactive'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <script>
                        window.onload = function() { window.print(); }
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
            }
        } catch (error) {
            console.error("Print failed", error);
            toast.error("Failed to generate print view");
        }
    };

    // Action State
    const [uploading, setUploading] = useState(false);

    // ... existing ...

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const data = new FormData();
        data.append("file", file);
        data.append("fileType", "image");

        try {
            const res = await fetch("/api/v1/upload", {
                method: "POST",
                body: data
            });
            const json = await res.json();
            if (res.ok) {
                setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, avatar: json.url }
                }));
                toast.success("Photo uploaded!");
            } else {
                toast.error(json.error || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (!payload.password || !payload.password.trim()) {
                delete payload.password;
            }
            const res = await fetch("/api/v1/students", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    'x-session-id': selectedSessionId || ''
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const newStudent = await res.json();

                if (formData.admissionBatch) {
                    try {
                        const isBundleVal = formData.admissionStd?.startsWith("bundle_");
                        const bundleId = isBundleVal ? formData.admissionStd.replace("bundle_", "") : null;
                        const bundleObj = bundleId ? courseBundles.find(b => b._id === bundleId) : null;

                        const enrollRes = await fetch(`/api/v1/students/${newStudent._id}/enroll`, {
                            method: "POST",
                            headers: { 
                                "Content-Type": "application/json",
                                'x-session-id': formData.sessionId || selectedSessionId || ''
                            },
                            body: JSON.stringify({ 
                                batchId: formData.admissionBatch,
                                courseBundleId: bundleId || null,
                                customAmount: bundleObj ? bundleObj.bundlePrice : null
                            })
                        });
                        if (!enrollRes.ok) {
                            const errData = await enrollRes.json().catch(() => ({}));
                            console.error("Auto-enrollment failed", errData);
                            toast.error(`Student admitted, but section enrollment failed: ${errData.error || "Unknown error"}`);
                        }
                    } catch (err) {
                        console.error("Auto-enrollment failed", err);
                    }
                }

                setIsAddModalOpen(false);
                setFormData(getInitialFormData(selectedSessionId));
                fetchStudents();
                toast.success("Student registered successfully");
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create student");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to create student");
        }
    };

    const handlePhotoFolderSelect = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setPhotoMap(new Map());
            setPhotoFilesCount(0);
            return;
        }
        const { map, count } = processImageFolder(files);
        setPhotoMap(map);
        setPhotoFilesCount(count);
        toast.success(`Indexed ${count} photos from folder`);
    };

    const handleUploadAndPreview = async () => {
        if (!importFile || !importBatchId) {
            toast.error("Please select a file and a target class/section.");
            return;
        }
        setLoading(true);
        setImportStatus("uploading");

        try {
            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("targetBatchId", importBatchId);

            const res = await fetch("/api/v1/students/import?preview=true", {
                method: "POST",
                headers: {
                    'x-session-id': selectedSessionId || ''
                },
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.isPreview) {
                setImportResult({
                    rows: data.rows,
                    totalRows: data.totalRows,
                    validRows: data.validRows,
                    invalidRows: data.invalidRows
                });

                // Match photos if photo folder was loaded
                if (photoMap.size > 0 && Array.isArray(data.rows)) {
                    const matched = {};
                    data.rows.forEach((row, idx) => {
                        const rowKey = row.rowIdx !== undefined ? row.rowIdx : idx;
                        const file = findMatchingPhoto(row, photoMap);
                        if (file) {
                            matched[rowKey] = file;
                        }
                    });
                    setMatchedPhotos(matched);
                } else {
                    setMatchedPhotos({});
                }

                setImportStatus("preview");
            } else {
                setImportStatus("error");
                toast.error(data.error || "Preview failed");
            }
        } catch (error) {
            setImportStatus("error");
            console.error("Preview error", error);
            toast.error("Preview failed");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importFile || !importBatchId) return;
        setLoading(true);

        try {
            let uploadedPhotosMap = {};
            const matchedEntries = Object.entries(matchedPhotos).map(([rowIdx, file]) => ({
                rowIdx: Number(rowIdx),
                file
            }));

            if (matchedEntries.length > 0) {
                setImportStatus("uploading_photos");
                uploadedPhotosMap = await compressAndUploadPhotos(matchedEntries, (progress) => {
                    setPhotoUploadProgress(progress);
                });
            }

            setImportStatus("importing");

            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("targetBatchId", importBatchId);
            if (Object.keys(uploadedPhotosMap).length > 0) {
                formData.append("photosPayload", JSON.stringify(uploadedPhotosMap));
            }

            const res = await fetch("/api/v1/students/import", {
                method: "POST",
                headers: {
                    'x-session-id': selectedSessionId || ''
                },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setImportResult({
                    successCount: data.importedCount,
                    failedCount: data.failedCount,
                    errors: data.errors
                });
                setImportStatus("success");
                if (data.importedCount > 0) {
                    fetchStudents(); // Refresh list
                    toast.success(`Imported ${data.importedCount} students successfully`);
                }
            } else {
                setImportStatus("error");
                toast.error(data.error || "Import failed");
            }
        } catch (error) {
            setImportStatus("error");
            console.error("Import error", error);
            toast.error("Import failed");
        } finally {
            setLoading(false);
        }
    };

    const fetchClassStudents = async (batchId) => {
        if (!batchId) {
            setPhotoStudents([]);
            return;
        }
        try {
            setPhotoLoading(true);
            const res = await fetch(`/api/v1/batches/${batchId}`);
            const data = await res.json();
            const batch = data.batch;
            if (batch && Array.isArray(batch.enrolledStudents)) {
                const list = batch.enrolledStudents
                    .filter(e => e.status === 'active' && e.student)
                    .map(e => {
                        const s = e.student;
                        return {
                            studentId: s._id,
                            studentName: `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.trim(),
                            firstName: s.profile?.firstName || '',
                            lastName: s.profile?.lastName || '',
                            rollNo: s.metadata?.studentDetails?.rollNo || '',
                            admissionNo: s.enrollmentNumber || s.metadata?.studentDetails?.grNumber || '',
                            photoNo: '',
                            currentAvatar: s.profile?.avatar || ''
                        };
                    });
                list.sort((a, b) => {
                    const rollA = parseInt(a.rollNo, 10);
                    const rollB = parseInt(b.rollNo, 10);
                    if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
                    return a.studentName.localeCompare(b.studentName);
                });
                setPhotoStudents(list);
            }
        } catch (e) {
            console.error("Failed to fetch students for batch", e);
            toast.error("Failed to load class students");
        } finally {
            setPhotoLoading(false);
        }
    };

    useEffect(() => {
        if (photoMap.size > 0 && photoStudents.length > 0) {
            const matched = {};
            photoStudents.forEach((student) => {
                const file = findMatchingPhoto(student, photoMap);
                if (file) {
                    matched[student.studentId] = file;
                }
            });
            setMatchedExistingPhotos(matched);
        } else {
            setMatchedExistingPhotos({});
        }
    }, [photoMap, photoStudents]);

    const handlePhotoExcelSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const XLSX = await import("xlsx");
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);

            setPhotoStudents(prev => {
                return prev.map(s => {
                    const match = json.find(row => 
                        (row.StudentID && String(row.StudentID) === String(s.studentId)) ||
                        (row.AdmissionNo && String(row.AdmissionNo).toLowerCase() === String(s.admissionNo).toLowerCase()) ||
                        (row.RollNo && String(row.RollNo) === String(s.rollNo)) ||
                        ((row.FirstName || '') + ' ' + (row.LastName || '')).trim().toLowerCase() === s.studentName.toLowerCase()
                    );
                    return {
                        ...s,
                        photoNo: match?.PhotoNo ? String(match.PhotoNo).trim() : s.photoNo
                    };
                });
            });
            toast.success(`Loaded ${json.length} student rows from Excel`);
        } catch (err) {
            console.error("Failed to parse photo Excel sheet", err);
            toast.error("Failed to parse Excel file");
        }
    };

    const handleConfirmExistingPhotosUpload = async () => {
        const matchedEntries = Object.entries(matchedExistingPhotos).map(([studentId, file]) => ({
            studentId,
            file
        }));

        if (matchedEntries.length === 0) {
            toast.error("No matched photos to upload");
            return;
        }

        setPhotoStatus("uploading_photos");
        try {
            const uploadedMap = await compressAndUploadPhotos(matchedEntries.map((e, idx) => ({
                rowIdx: idx,
                file: e.file
            })), (progress) => {
                setPhotoUploadProgress(progress);
            });

            const updates = matchedEntries.map((e, idx) => {
                const uploaded = uploadedMap[idx];
                return {
                    studentId: e.studentId,
                    avatarUrl: uploaded?.url,
                    publicId: uploaded?.publicId
                };
            }).filter(u => u.avatarUrl);

            setPhotoStatus("updating_db");
            const res = await fetch("/api/v1/students/bulk-photos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates })
            });

            const data = await res.json();
            if (res.ok) {
                setPhotoUpdateResult({
                    successCount: data.updatedCount || updates.length,
                    totalCount: photoStudents.length
                });
                setPhotoStatus("success");
                fetchStudents(); // Refresh student list
                toast.success(`Updated ${data.updatedCount || updates.length} student photos successfully!`);
            } else {
                setPhotoStatus("error");
                toast.error(data.error || "Failed to update photos");
            }
        } catch (error) {
            console.error("Bulk photo upload failed", error);
            setPhotoStatus("error");
            toast.error("Bulk photo upload failed");
        }
    };

    const resetImport = () => {
        setImportFile(null);
        setPhotoMap(new Map());
        setPhotoFilesCount(0);
        setMatchedPhotos({});
        setMatchedExistingPhotos({});
        setPhotoUploadProgress(null);
        setImportStatus("idle");
        setImportResult(null);
        setPhotoStatus("idle");
        setPhotoUpdateResult(null);
        setIsImportModalOpen(false);
    };



    // ... existing ...

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            fetchStudents(1); // Fetch page 1 initially
            return;
        }

        const timer = setTimeout(() => {
            fetchStudents(1); // Reset to page 1 on filter change
        }, 500);
        return () => clearTimeout(timer);
    }, [search, filters, selectedSessionId]);

    const toggleStudentSelection = (id) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedStudents(newSelection);
    };

    const toggleAllOnPage = () => {
        if (selectedStudents.size === students.length && students.length > 0) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s._id)));
        }
    };

    // Trigger fetch when page changes (but not filters)
    useEffect(() => {
        if (!isFirstRender.current) {
            fetchStudents(pagination.page);
        }
    }, [pagination.page]);

    // ... existing ...



    // ... existing ...

    // Pagination helper
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
        fetchStudents(1, newLimit);
    };

    const handlePromote = async (targetBatchId) => {
        try {
            const res = await fetch("/api/v1/students/promote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: Array.from(selectedStudents),
                    targetBatchId
                })
            });

            if (res.ok) {
                toast.success("Students promoted successfully");
                setIsPromotionModalOpen(false);
                setSelectedStudents(new Set());
                fetchStudents();
            } else {
                const error = await res.json();
                toast.error(error.error || "Promotion failed");
            }
        } catch (error) {
            console.error("Promotion error", error);
            toast.error("Promotion failed");
        }
    };

    const handleBulkDelete = async () => {
        try {
            setIsDeleting(true);
            const res = await fetch("/api/v1/students/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: Array.from(selectedStudents)
                })
            });

            const result = await res.json();

            // Handle success (200) or partial success (207)
            if (res.ok || res.status === 207) {
                if (result.successCount > 0) {
                    toast.success(`${result.successCount} students deleted successfully`);
                }
                if (result.failedCount > 0) {
                    toast.error(`Failed to delete ${result.failedCount} students`);
                }
                setIsDeleteModalOpen(false);
                setSelectedStudents(new Set());
                fetchStudents();
            } else {
                // Complete failure
                toast.error(result.error || "Deletion failed");
            }
        } catch (error) {
            console.error("Delete error", error);
            toast.error("Deletion failed");
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchFeePresets = async (courseId) => {
        try {
            const url = courseId ? `/api/v1/fee-presets?courseId=${courseId}` : "/api/v1/fee-presets";
            const res = await fetch(url);
            const data = await res.json();
            setFeePresets(data.presets || []);
        } catch (e) {
            console.error("Failed to fetch fee presets", e);
        }
    };

    const handleOpenFeePresetModal = () => {
        const initialBatchId = filters.batchId || "";
        const selectedBatch = batches.find(b => b._id === initialBatchId);
        const courseId = selectedBatch?.course?._id || selectedBatch?.course || filters.courseId || "";
        
        fetchFeePresets(courseId);
        setFeePresetApply({
            batchId: initialBatchId,
            presetId: "base_class_fee",
            numInstallments: 1
        });
        setIsFeePresetModalOpen(true);
    };

    const handleApplyFeePreset = async () => {
        if (!feePresetApply.batchId) {
            toast.error(isSchool ? "Please select a section" : "Please select a batch");
            return;
        }
        try {
            setIsApplyingPreset(true);
            const res = await fetch("/api/v1/fees/bulk-apply-preset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(feePresetApply)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`✅ ${data.message || `${data.createdCount} fee records updated/created.`}`);
                setIsFeePresetModalOpen(false);
            } else {
                toast.error(data.error || "Failed to apply fees");
            }
        } catch (e) {
            toast.error("Failed to apply fees");
        } finally {
            setIsApplyingPreset(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Promotion Modal */}
            <Modal
                isOpen={isPromotionModalOpen}
                onClose={() => setIsPromotionModalOpen(false)}
                title="Promote Students"
            >
                <PromotionModalContent 
                    batches={batches} 
                    courses={courses}
                    sessions={sessions}
                    isSchool={isSchool}
                    isCollege={isCollege}
                    selectedCount={selectedStudents.size}
                    onPromote={handlePromote}
                    onClose={() => setIsPromotionModalOpen(false)}
                />
             </Modal>
             
             {/* Delete Confirmation Modal */}
             <Modal
                 isOpen={isDeleteModalOpen}
                 onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
                 title="Delete Students"
             >
                 <div className="space-y-4">
                     <div className="flex items-start gap-3">
                         <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
                         <div>
                             <p className="text-sm font-medium text-gray-900">
                                 Delete {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}?
                             </p>
                             <p className="text-sm text-gray-600 mt-1">
                                 This action cannot be undone. All student data including enrollment, fees, and attendance records will be permanently deleted.
                             </p>
                         </div>
                     </div>
                     <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                         <Button
                             onClick={() => setIsDeleteModalOpen(false)}
                             variant="outline"
                             disabled={isDeleting}
                         >
                             Cancel
                         </Button>
                         <Button
                             onClick={handleBulkDelete}
                             variant="primary"
                             className="bg-red-600 hover:bg-red-700"
                             disabled={isDeleting}
                         >
                             {isDeleting ? "Deleting..." : `Delete ${selectedStudents.size} Students`}
                         </Button>
                     </div>
                 </div>
             </Modal>

             {/* Apply Fees & Installments Modal */}
             <Modal
                 isOpen={isFeePresetModalOpen}
                 onClose={() => !isApplyingPreset && setIsFeePresetModalOpen(false)}
                 title={isSchool ? "Configure Class Fees & Installments" : "Apply Fees & Installments"}
             >
                 {(() => {
                     const selectedBatch = batches.find(b => b._id === feePresetApply.batchId);
                     const courseId = selectedBatch?.course?._id || selectedBatch?.course || "";
                     const courseObj = typeof selectedBatch?.course === 'object' && selectedBatch?.course?._id
                         ? selectedBatch.course
                         : courses.find(c => c._id === courseId);
                     const baseCourseFee = courseObj?.fees?.amount || 0;

                     const feeOptions = [];
                     if (baseCourseFee > 0) {
                         feeOptions.push({
                             label: `★ ${courseObj?.name || (isSchool ? "Class" : "Course")} Base Fee — ₹${baseCourseFee.toLocaleString()}`,
                             value: "base_class_fee"
                         });
                     }
                     feePresets.forEach(p => {
                         feeOptions.push({
                             label: `${p.name} — ₹${p.amount.toLocaleString()}`,
                             value: p._id
                         });
                     });

                     const activeFeeAmount = feePresetApply.presetId === "base_class_fee"
                         ? baseCourseFee
                         : (feePresets.find(p => p._id === feePresetApply.presetId)?.amount || (baseCourseFee > 0 ? baseCourseFee : 0));

                     return (
                         <div className="space-y-5">
                             <p className="text-sm text-slate-500">
                                 {isSchool 
                                     ? "Select a class section and choose how to schedule the annual fee into installments for all students in that classroom." 
                                     : "Select a batch and apply the course fee or a custom fee preset across all enrolled students."
                                 }
                             </p>

                             {/* Batch selector */}
                             <div>
                                 <label className="block text-xs font-bold text-slate-600 mb-1">{isSchool ? "Section / Class" : "Batch"}</label>
                                 <Select
                                     value={feePresetApply.batchId}
                                     onChange={(val) => {
                                         const b = batches.find(item => item._id === val);
                                         const cId = b?.course?._id || b?.course || "";
                                         fetchFeePresets(cId);
                                         setFeePresetApply(prev => ({ 
                                             ...prev, 
                                             batchId: val, 
                                             presetId: "base_class_fee" 
                                         }));
                                     }}
                                     placeholder={isSchool ? "Select section…" : "Select batch…"}
                                     options={batches
                                         .filter(b => !selectedSessionId || (
                                             (b.session?._id && String(b.session._id) === String(selectedSessionId)) ||
                                             String(b.session) === String(selectedSessionId) ||
                                             !b.session
                                         ))
                                         .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                         .map(b => ({ label: b.name, value: b._id }))
                                     }
                                 />
                             </div>

                             {/* Fee Structure selector */}
                             <div>
                                 <div className="flex justify-between items-center mb-1">
                                     <label className="block text-xs font-bold text-slate-600">Fee Structure / Preset</label>
                                     {baseCourseFee > 0 && (
                                         <span className="text-[11px] text-blue-600 font-bold">Base Fee: ₹{baseCourseFee.toLocaleString()}</span>
                                     )}
                                 </div>
                                 <Select
                                     value={feePresetApply.presetId || (baseCourseFee > 0 ? "base_class_fee" : "")}
                                     onChange={(val) => setFeePresetApply(prev => ({ ...prev, presetId: val }))}
                                     placeholder={feeOptions.length === 0 ? "No base fee or presets configured" : "Select fee structure…"}
                                     options={feeOptions}
                                 />
                                 {feeOptions.length === 0 && selectedBatch && (
                                     <p className="text-xs text-amber-600 mt-1">
                                         No fee configured on this {isSchool ? "class" : "course"}. Set a fee on the {isSchool ? "Classes" : "Courses"} page first.
                                     </p>
                                 )}
                             </div>

                             {/* Number of installments */}
                             <div>
                                 <label className="block text-xs font-bold text-slate-600 mb-1">Number of Installments</label>
                                 <select
                                     className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                     value={feePresetApply.numInstallments}
                                     onChange={e => setFeePresetApply(prev => ({ ...prev, numInstallments: parseInt(e.target.value, 10) }))}
                                 >
                                     <option value={1}>1 (Full payment / Annual)</option>
                                     <option value={2}>2 installments (Half-yearly / Term-wise)</option>
                                     <option value={3}>3 installments (Trimester)</option>
                                     <option value={4}>4 installments (Quarterly)</option>
                                     <option value={6}>6 installments (Bi-monthly)</option>
                                     <option value={12}>12 installments (Monthly)</option>
                                 </select>
                                 {activeFeeAmount > 0 && (
                                     <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
                                         <span className="text-blue-700 font-medium">Total: <strong>₹{activeFeeAmount.toLocaleString()}</strong></span>
                                         <span className="text-blue-900 font-bold">
                                             ₹{(activeFeeAmount / feePresetApply.numInstallments).toFixed(2)} per installment
                                         </span>
                                     </div>
                                 )}
                             </div>

                             <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                 <Button variant="outline" onClick={() => setIsFeePresetModalOpen(false)} disabled={isApplyingPreset}>Cancel</Button>
                                 <Button
                                     onClick={handleApplyFeePreset}
                                     disabled={isApplyingPreset || !feePresetApply.batchId || activeFeeAmount <= 0}
                                     className="flex items-center gap-2"
                                 >
                                     <CreditCard size={16} />
                                     {isApplyingPreset ? "Applying…" : (isSchool ? "Apply to Section" : "Apply to Batch")}
                                 </Button>
                             </div>
                         </div>
                     );
                 })()}
             </Modal>
             
             {/* Page Action Bar */}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold text-slate-900">
                        {isSchool ? "Students Directory" : "Learner Directory"}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        {isSchool ? "Manage enrolled students, promotions, and academic records" : "Manage active profiles, admissions, and student lifecycle"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                     {selectedStudents.size > 0 && (
                         <>
                             <Button 
                                 onClick={() => setIsPromotionModalOpen(true)} 
                                 variant="outline" 
                                 size="md" 
                                 className="flex items-center gap-2 px-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                             >
                                 <GraduationCap size={18} strokeWidth={2.5} />
                                 <span>Promote {selectedStudents.size} Students</span>
                             </Button>
                             <Button 
                                 onClick={() => setIsDeleteModalOpen(true)} 
                                 variant="primary" 
                                 size="md" 
                                 className="flex items-center gap-2 px-6 bg-red-600 hover:bg-red-700 shadow-sm"
                             >
                                 <Trash2 size={18} strokeWidth={2.5} />
                                 <span>Delete {selectedStudents.size} Students</span>
                             </Button>
                         </>
                     )}
                    <Button onClick={() => setIsImportModalOpen(true)} variant="outline" size="md" className="hidden sm:flex items-center gap-2 border-slate-200">
                        <Upload size={16} />
                        <span>Import Students</span>
                    </Button>
                    <Button
                        onClick={handleOpenFeePresetModal}
                        variant="outline"
                        size="md"
                        className="hidden sm:flex items-center gap-2 border-slate-200 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                        <CreditCard size={16} />
                        <span>{isSchool ? "Apply Fees / Installments" : "Apply Fee Preset"}</span>
                    </Button>
                    <Button 
                        onClick={() => setIsAddModalOpen(true)} 
                        size="md" 
                        className="flex items-center gap-2 px-6 shadow-sm shadow-blue-500/10"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        <span>New Admission</span>
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 bg-[#F9FAFB] border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        <div className="min-w-[160px] max-w-xs">
                            <Select
                                value={filters.courseId}
                                onChange={(val) => setFilters({ ...filters, courseId: val, batchId: "" })}
                                placeholder={isSchool ? "All Classes" : "All Courses"}
                                className="w-auto"
                                buttonClassName="w-auto min-w-full bg-white border-slate-200"
                                options={[
                                    { label: isSchool ? "All Classes" : "All Courses", value: "" },
                                    ...(isVocational && courseBundles.filter(b => b.isActive !== false).length > 0 ? [
                                        { label: "── 🎁 PACKAGES ──", value: "hdr_bundles", disabled: true },
                                        ...courseBundles.filter(b => b.isActive !== false).map(b => ({ label: `🎁 ${b.title}`, value: b._id })),
                                        { label: "── COURSES ──", value: "hdr_courses", disabled: true },
                                    ] : []),
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                        </div>

                        <div className="min-w-[160px] max-w-xs">
                            <Select
                                value={filters.batchId}
                                onChange={(val) => setFilters({ ...filters, batchId: val })}
                                placeholder={isSchool ? "All Sections" : "All Batches"}
                                className="w-auto"
                                buttonClassName="w-auto min-w-full bg-white border-slate-200"
                                options={[
                                    { label: isSchool ? "All Sections" : "All Batches", value: "" },
                                    ...batches
                                        .filter(b => {
                                            const matchesCourse = !filters.courseId ||
                                                b.course === filters.courseId || b.course?._id === filters.courseId ||
                                                b.courseBundle === filters.courseId || b.courseBundle?._id === filters.courseId;
                                            const matchesSession = !isSchool || !selectedSessionId || (b.session === selectedSessionId || b.session?._id === selectedSessionId || !b.session);
                                            return matchesCourse && matchesSession;
                                        })
                                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                        .map(b => ({ label: b.name, value: b._id }))
                                ]}
                            />
                        </div>

                        <div className="min-w-[140px]">
                            <Select
                                value={filters.isActive}
                                onChange={(val) => setFilters({ ...filters, isActive: val })}
                                placeholder="All Status"
                                buttonClassName="bg-white border-slate-200"
                                options={[
                                    { label: "All Status", value: "" },
                                    { label: "Active Only", value: "true" },
                                    { label: "Inactive", value: "false" }
                                ]}
                            />
                        </div>

                        {session?.user?.role === 'super_admin' && institutes.length > 0 && (
                            <div className="min-w-[180px] max-w-xs">
                                <Select
                                    value={filters.instituteId}
                                    onChange={(val) => setFilters({ ...filters, instituteId: val })}
                                    placeholder="All Institutes"
                                    className="w-auto"
                                    buttonClassName="w-auto min-w-full"
                                    options={[
                                        { label: "All Institutes", value: "" },
                                        ...institutes.map(i => ({ label: i.name, value: i._id }))
                                    ]}
                                />
                            </div>
                        )}

                        {(filters.courseId || filters.batchId || filters.instituteId || filters.isActive !== "true") && (<Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({ batchId: "", courseId: "", instituteId: "", isActive: "true" })}
                            className="text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-red-500"
                        >
                            Reset
                        </Button>
                        )}

                        <div className="pl-2 border-l border-slate-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrint}
                                className="text-slate-400 hover:text-premium-blue hover:bg-premium-blue/5"
                                title="Print List"
                            >
                                <Printer size={18} />
                            </Button>
                        </div>
                    </div>
                </div>
                <div>
                    {loading ? (
                        <LoadingSpinner />
                    ) : students.length > 0 ? (
                        <>
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-y border-slate-100">
                                            <th className="px-6 py-4 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedStudents.size === students.length && students.length > 0}
                                                    onChange={toggleAllOnPage}
                                                    className="w-4 h-4 rounded border-slate-300 text-premium-blue"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{isSchool ? "Class & Section" : "Course & Batch"}</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map((student) => (
                                            <tr key={student._id} className={`group hover:bg-slate-50/50 transition-colors ${selectedStudents.has(student._id) ? 'bg-blue-50/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStudents.has(student._id)}
                                                        onChange={() => toggleStudentSelection(student._id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-premium-blue"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-premium-blue/10 flex items-center justify-center text-premium-blue font-bold border border-premium-blue/20 overflow-hidden">
                                                            {student.profile?.avatar ? (
                                                                <img src={student.profile.avatar} alt={student.profile.firstName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.profile?.firstName?.[0]
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 capitalize">{student.fullName}</p>
                                                            <p className="text-[11px] font-medium text-slate-400 break-all">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {student.batches && student.batches.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {student.batches.map((b) => (
                                                                <span key={b._id} className="text-xs font-bold text-slate-700">
                                                                    {(b.courseBundle ? `🎁 ${b.courseBundle.title}` : (b.course?.name || "No Class"))} / {b.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold font-mono border border-slate-200">
                                                        {student.enrollmentNumber || "PENDING"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] font-bold text-slate-600">{student.profile?.phone || "—"}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={student.isActive ? "success" : "danger"} className="text-[10px] px-2 py-0.5">
                                                        {student.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <button
                                                        disabled={isChatLoading}
                                                        onClick={async () => {
                                                            if (isChatLoading) return;
                                                            setIsChatLoading(true);
                                                            try {
                                                                const res = await fetch("/api/v1/chat/conversations", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ targetUserId: student._id })
                                                                });
                                                                if (res.ok) {
                                                                    router.push("/admin/chat");
                                                                } else {
                                                                    toast.error("Failed to start chat");
                                                                }
                                                            } catch (err) {
                                                                toast.error("Failed to start chat");
                                                            } finally {
                                                                setIsChatLoading(false);
                                                            }
                                                        }}
                                                        className={`inline-flex p-2 rounded-lg transition-all ${isChatLoading ? 'opacity-50 cursor-not-allowed text-slate-300' : 'hover:bg-white text-slate-300 hover:text-green-500 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
                                                        title="Message Student"
                                                    >
                                                        {isChatLoading ? <LoadingSpinner size="sm" /> : <MessageSquare size={16} />}
                                                    </button>
                                                    <Link
                                                        href={`/admin/students/${student._id}`}
                                                        className="inline-flex p-2 hover:bg-white rounded-lg text-slate-300 hover:text-premium-blue hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                                        title="Edit Student"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                                    <div>
                                        Showing <span className="font-bold text-slate-700">{Math.min(students.length, pagination.limit)}</span> of <span className="font-bold text-slate-700">{pagination.total}</span> students
                                        <span className="mx-2 text-slate-300">|</span>
                                        Page <span className="font-bold text-slate-700">{pagination.page}</span> of <span className="font-bold text-slate-700">{pagination.pages}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span>Show:</span>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) => handleLimitChange(Number(e.target.value))}
                                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:border-premium-blue cursor-pointer transition-all"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={1000}>All</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>

                                    {/* Page Numbers - Simplified for now */}
                                    <div className="hidden sm:flex items-center gap-1">
                                        {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                            // Handle truncated pagination view logic if needed later
                                            // For now simple range near current page
                                            let p = pagination.page;
                                            if (pagination.pages <= 5) p = i + 1;
                                            else if (pagination.page < 3) p = i + 1;
                                            else if (pagination.page > pagination.pages - 2) p = pagination.pages - 4 + i;
                                            else p = pagination.page - 2 + i;

                                            return (
                                                <button
                                                    key={p}
                                                    onClick={() => handlePageChange(p)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${pagination.page === p
                                                        ? "bg-premium-blue text-white shadow-md shadow-blue-500/20"
                                                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No students found"
                            description="Start by adding your first student to the system."
                            actionLabel="Add Student"
                            onAction={() => setIsAddModalOpen(true)}
                        />
                    )}
                </div>
            </div>

            {/* Add Student Modal ... */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)} 
                title="Register New Student"
                className="max-w-2xl"
            >
                <form onSubmit={handleAddStudent} className="space-y-8">
                    {/* 1. Academic & Account Info */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-blue-100"></span>
                            Academic & Account
                            <span className="flex-1 h-px bg-blue-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                placeholder="John"
                                value={formData.profile.firstName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                                required
                            />
                            <Input
                                label="Last Name (Optional)"
                                placeholder="Initials or Surname"
                                value={formData.profile.lastName}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                            />
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden shrink-0">
                                {formData.profile.avatar ? (
                                    <img src={formData.profile.avatar} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Upload size={24} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    className="block w-full text-xs text-slate-500
                                      file:mr-4 file:py-1.5 file:px-3
                                      file:rounded-lg file:border-0
                                      file:text-[10px] file:font-black
                                      file:bg-premium-blue/10 file:text-premium-blue
                                      hover:file:bg-premium-blue/20
                                      cursor-pointer
                                    "
                                />
                                {uploading && <p className="text-[10px] text-premium-blue mt-1 font-bold animate-pulse">Uploading...</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <Input
                                label="Phone Number"
                                placeholder="+91 98765 43210"
                                value={formData.profile.phone}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {institutes.length > 0 && (
                                <Select
                                    label="Institute"
                                    value={formData.institute}
                                    onChange={(val) => setFormData({ ...formData, institute: val })}
                                    options={[
                                        { label: "Select Institute", value: "" },
                                        ...institutes.map(i => ({ label: `${i.name}`, value: i._id }))
                                    ]}
                                    required
                                />
                            )}
                            <Input
                                label="Temporary Password"
                                type="password"
                                placeholder="Leave blank for default (Student@123)"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                helperText="Optional • Defaults to Student@123 if left blank"
                            />
                        </div>
                    </div>

                    {/* 2. Personal Details */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-purple-100"></span>
                            Personal Details
                            <span className="flex-1 h-px bg-purple-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <Select
                                label="Gender"
                                value={formData.profile.gender}
                                onChange={(val) => setFormData({ ...formData, profile: { ...formData.profile, gender: val } })}
                                options={[
                                    { label: "Select", value: "" },
                                    { label: "Male", value: "Male" },
                                    { label: "Female", value: "Female" },
                                    { label: "Other", value: "Other" }
                                ]}
                            />
                            <Input
                                label="Date of Birth"
                                type="date"
                                value={formData.profile.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, dateOfBirth: e.target.value } })}
                            />
                            <Select
                                label="Blood Group"
                                value={formData.profile.bloodGroup}
                                onChange={(val) => setFormData({ ...formData, profile: { ...formData.profile, bloodGroup: val } })}
                                options={[
                                    { label: "Select", value: "" },
                                    { label: "A+", value: "A+" }, { label: "A-", value: "A-" },
                                    { label: "B+", value: "B+" }, { label: "B-", value: "B-" },
                                    { label: "AB+", value: "AB+" }, { label: "AB-", value: "AB-" },
                                    { label: "O+", value: "O+" }, { label: "O-", value: "O-" }
                                ]}
                            />
                        </div>
                    </div>

                    {/* 3. Identity Information */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-emerald-100"></span>
                            {isCollege ? "University & Government Identity (UUCMS / NEP)" : isVocational ? "Identity & Verification" : "School Identity"}
                            <span className="flex-1 h-px bg-emerald-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Input
                                label={isCollege ? "UUCMS / University Reg No" : isVocational ? "Registration / Roll No" : "G.R. Number"}
                                placeholder={isCollege ? "e.g. U03TJ21S0001" : isVocational ? "REG-001" : "GR123"}
                                value={formData.grNumber}
                                onChange={(e) => setFormData({ ...formData, grNumber: e.target.value })}
                            />
                            {isSchool && (
                                <Input
                                    label="UDISE ID"
                                    placeholder="Optional"
                                    value={formData.studentIdUdise}
                                    onChange={(e) => setFormData({ ...formData, studentIdUdise: e.target.value })}
                                />
                            )}
                            {(isSchool || isCollege) && (
                                <Input
                                    label={isCollege ? "APAAR / ABC ID (DigiLocker)" : "APAAR ID"}
                                    placeholder={isCollege ? "12-digit ABC ID" : "Optional"}
                                    value={formData.apaarId}
                                    onChange={(e) => setFormData({ ...formData, apaarId: e.target.value })}
                                />
                            )}
                            {isSchool && (
                                <Input
                                    label="PEN Number"
                                    placeholder="Permanent Enrollment"
                                    value={formData.penNumber}
                                    onChange={(e) => setFormData({ ...formData, penNumber: e.target.value })}
                                />
                            )}
                            <Input
                                label="Aadhar Number"
                                placeholder="12 Digit"
                                value={formData.aadharNumber}
                                onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 4. Academic History */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-amber-100"></span>
                            {isCollege ? "Admission & Program Info" : isVocational ? "Enrollment Details" : "Admission Info"}
                            <span className="flex-1 h-px bg-amber-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Admission Date"
                                type="date"
                                value={formData.admissionDate}
                                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                            />
                            <Select
                                label="Academic Session"
                                value={formData.sessionId}
                                onChange={(val) => setFormData({ ...formData, sessionId: val, admissionBatch: "" })}
                                options={[
                                    { label: "Select Session", value: "" },
                                    ...sessions.map(s => ({ label: s.sessionName, value: s._id }))
                                ]}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label={isCollege ? "Degree Program / Course" : isVocational ? "Course / Trade / Package" : "Admission Standard"}
                                value={formData.admissionStd}
                                onChange={(val) => setFormData({ ...formData, admissionStd: val, admissionBatch: "" })}
                                options={[
                                    { label: isCollege ? "Select Degree Program" : isVocational ? "Select Course or Package" : "Select Standard", value: "" },
                                    ...(isVocational && courseBundles.length > 0 ? [
                                        { label: "── 🎁 COURSE PACKAGES / SPECIAL OFFERS ──", value: "hdr_pkg", disabled: true },
                                        ...courseBundles.map(b => ({
                                            label: `🎁 ${b.title} (${b.code}) — ₹${(b.bundlePrice || 0).toLocaleString()}`,
                                            value: `bundle_${b._id}`
                                        })),
                                        { label: "── INDIVIDUAL COURSES ──", value: "hdr_courses", disabled: true }
                                    ] : []),
                                    ...courses.map(c => ({ label: c.name, value: c._id }))
                                ]}
                            />
                            {formData.admissionStd ? (
                                <Select
                                    label={isCollege ? "Semester & Section" : isVocational ? "Batch" : "Section / Batch"}
                                    value={formData.admissionBatch}
                                    onChange={(val) => setFormData({ ...formData, admissionBatch: val })}
                                    options={[
                                        { label: isCollege ? "Select Section" : isVocational ? "Select Batch" : "Select Section", value: "" },
                                        ...batches.filter(b => {
                                            const isBundleVal = formData.admissionStd.startsWith("bundle_");
                                            if (isBundleVal) {
                                                const bundleId = formData.admissionStd.replace("bundle_", "");
                                                return b.courseBundle?._id === bundleId || b.courseBundle === bundleId;
                                            }
                                            return b.course?._id === formData.admissionStd || b.course === formData.admissionStd;
                                        })
                                                  .filter(b => formData.sessionId ? (b.session?._id === formData.sessionId || b.session === formData.sessionId) : true)
                                                  .sort((a, b) => (a.semester || 1) - (b.semester || 1) || (a.name || "").localeCompare(b.name || ""))
                                                  .map(b => ({
                                                      label: isCollege && b.semester ? `Sem ${b.semester} - ${b.name}` : b.name,
                                                      value: b._id
                                                  }))
                                    ]}
                                />
                            ) : (
                                <Input
                                    label={isCollege ? "Previous Institution (10+2 / PUC)" : isVocational ? "Previous School / Qualification" : "Last School Attended"}
                                    placeholder={isCollege ? "PUC / CBSE / Diploma Institution" : "Previous School Name"}
                                    value={formData.lastSchoolAttended}
                                    onChange={(e) => setFormData({ ...formData, lastSchoolAttended: e.target.value })}
                                />
                            )}
                        </div>
                        {formData.admissionStd && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={isCollege ? "Previous Institution (10+2 / PUC)" : isVocational ? "Previous School / Qualification" : "Last School Attended"}
                                    placeholder={isCollege ? "PUC / CBSE / Diploma Institution" : "Previous School Name"}
                                    value={formData.lastSchoolAttended}
                                    onChange={(e) => setFormData({ ...formData, lastSchoolAttended: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {/* Transport Details (Conditional) */}
                    {isTransportEnabled && (
                        <div className="space-y-4">
                            <div className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-8 h-px bg-amber-100"></span>
                                Transport Service
                                <span className="flex-1 h-px bg-amber-100"></span>
                            </div>
                            
                            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                        <Bus size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700">Avail Transport Service?</h4>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Check this if the student will use institute transport</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ 
                                        ...formData, 
                                        transport: { 
                                            ...formData.transport, 
                                            isAvailing: !formData.transport.isAvailing 
                                        } 
                                    })}
                                    className={cn(
                                        "relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0",
                                        formData.transport.isAvailing ? "bg-amber-500" : "bg-slate-200"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                                        formData.transport.isAvailing ? "translate-x-6" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {formData.transport.isAvailing && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                                        <Select
                                            label="Select Route"
                                            value={formData.transport.route}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { 
                                                    ...formData.transport, 
                                                    route: val, 
                                                    vehicle: "", 
                                                    pickupStop: "", 
                                                    preset: "" 
                                                } 
                                            })}
                                            options={[
                                                { label: "Select Route", value: "" },
                                                ...transportRoutes.map(r => ({ label: r.name, value: r._id }))
                                            ]}
                                            required
                                        />
                                        <Select
                                            label="Select Vehicle"
                                            value={formData.transport.vehicle}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { ...formData.transport, vehicle: val } 
                                            })}
                                            options={[
                                                { label: "Select Vehicle", value: "" },
                                                ...transportVehicles
                                                    .filter(v => v.route?._id === formData.transport.route || v.route === formData.transport.route)
                                                    .map(v => ({ 
                                                        label: `${v.registrationNumber} (${v.currentOccupancy}/${v.capacity})`, 
                                                        value: v._id,
                                                        disabled: v.currentOccupancy >= v.capacity
                                                    }))
                                            ]}
                                            required
                                            disabled={!formData.transport.route}
                                        />
                                        <Select
                                            label="Pickup Stop"
                                            value={formData.transport.pickupStop}
                                            onChange={(val) => setFormData({ 
                                                ...formData, 
                                                transport: { ...formData.transport, pickupStop: val } 
                                            })}
                                            options={[
                                                { label: "Select Stop", value: "" },
                                                ...(transportRoutes.find(r => r._id === formData.transport.route)?.stops || [])
                                                    .sort((a, b) => a.order - b.order)
                                                    .map((s, idx) => ({ label: `${s.name} (${s.pickupTime})`, value: s.name, key: `${s.name}-${idx}` }))
                                            ]}
                                            required
                                            disabled={!formData.transport.route}
                                        />
                                        <Select
                                            label="Fee Preset"
                                            value={formData.transport.preset}
                                            onChange={(val) => {
                                                const preset = transportPresets.find(p => p._id === val);
                                                setFormData({ 
                                                    ...formData, 
                                                    transport: { 
                                                        ...formData.transport, 
                                                        preset: val,
                                                        maxCycles: preset?.maxCycles || "" 
                                                    } 
                                                });
                                            }}
                                            options={[
                                                { label: "Select Preset", value: "" },
                                                ...transportPresets
                                                    .filter(p => !p.route || p.route?._id === formData.transport.route || p.route === formData.transport.route)
                                                    .map(p => ({ label: `${p.name} (₹${p.amount}/${p.billingCycle})`, value: p._id }))
                                            ]}
                                            required
                                            disabled={!formData.transport.route}
                                        />
                                    </div>
                                    
                                    {formData.transport.preset && (
                                        <div className="animate-fade-in p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-amber-700">
                                                    <Calendar size={16} />
                                                    <span className="text-[11px] font-bold uppercase tracking-wider">Dynamic Billing Duration</span>
                                                </div>
                                                <Badge className="bg-amber-100 text-amber-700 border-none font-bold">Override</Badge>
                                            </div>
                                            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
                                                <Input 
                                                    type="number"
                                                    placeholder="Months/Cycles"
                                                    value={formData.transport.maxCycles}
                                                    onChange={(e) => setFormData({ 
                                                        ...formData, 
                                                        transport: { ...formData.transport, maxCycles: e.target.value } 
                                                    })}
                                                    className="bg-white"
                                                />
                                                <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed">
                                                    Custom limit for this student.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* 5. Family Details */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-rose-100"></span>
                            Family Details
                            <span className="flex-1 h-px bg-rose-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Input
                                label="Father's Name"
                                value={formData.fatherName}
                                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                            />
                            <Input
                                label="Father's Phone"
                                placeholder="Number"
                                value={formData.fatherPhone}
                                onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                            />
                            <Input
                                label="Father's Aadhar"
                                value={formData.fatherAadhar}
                                onChange={(e) => setFormData({ ...formData, fatherAadhar: e.target.value })}
                            />
                            <Input
                                label="Mother's Name"
                                value={formData.motherName}
                                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                            />
                            <Input
                                label="Mother's Phone"
                                placeholder="Number"
                                value={formData.motherPhone}
                                onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                            />
                            <Input
                                label="Mother's Aadhar"
                                value={formData.motherAadhar}
                                onChange={(e) => setFormData({ ...formData, motherAadhar: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 6. Address */}
                    <div className="space-y-4">
                        <div className="text-xs font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-cyan-100"></span>
                            Contact Address
                            <span className="flex-1 h-px bg-cyan-100"></span>
                        </div>
                        
                        <Input
                            label="Street Address"
                            value={formData.profile.address.street}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, street: e.target.value } } })}
                        />
                        <div className="grid grid-cols-3 gap-4">
                            <Input
                                label="City"
                                value={formData.profile.address.city}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, city: e.target.value } } })}
                            />
                            <Input
                                label="State"
                                value={formData.profile.address.state}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, state: e.target.value } } })}
                            />
                            <Input
                                label="Pincode"
                                value={formData.profile.address.pincode}
                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, address: { ...formData.profile.address, pincode: e.target.value } } })}
                            />
                        </div>
                    </div>

                    {/* 7. Demographics & Origin */}
                    <div className="space-y-4 pb-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-8 h-px bg-slate-100"></span>
                            Demographics & Origin
                            <span className="flex-1 h-px bg-slate-100"></span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Nationality"
                                value={formData.nationality}
                                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            />
                            <Input
                                label="Mother Tongue"
                                value={formData.motherTongue}
                                onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                            />
                            <Input
                                label="Religion"
                                value={formData.religion}
                                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            />
                            <Input
                                label="Place of Birth (City)"
                                value={formData.placeOfBirth.city}
                                onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, city: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Input
                                label="Taluka"
                                value={formData.placeOfBirth.taluka}
                                onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, taluka: e.target.value } })}
                            />
                            <Input
                                label="District"
                                value={formData.placeOfBirth.district}
                                onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, district: e.target.value } })}
                            />
                            <Input
                                label="State (Birth)"
                                value={formData.placeOfBirth.state}
                                onChange={(e) => setFormData({ ...formData, placeOfBirth: { ...formData.placeOfBirth, state: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Caste"
                                value={formData.caste}
                                onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                            />
                            <Input
                                label="Sub-Caste"
                                value={formData.subCaste}
                                onChange={(e) => setFormData({ ...formData, subCaste: e.target.value })}
                            />
                        </div>
                        <Input
                            label="Referred By"
                            placeholder="Website, Friend, etc."
                            value={formData.referredBy}
                            onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                        />

                        {isRteEnabled && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-8 h-px bg-blue-100"></span>
                                    RTE & Scholarship Concessions
                                    <span className="flex-1 h-px bg-blue-100"></span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-slate-700">RTE Admission</h4>
                                            <p className="text-[10px] text-slate-400">Flag as RTE student (100% tuition waiver)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                rte: { ...formData.rte, isRte: !formData.rte?.isRte }
                                            })}
                                            className={cn(
                                                "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
                                                formData.rte?.isRte ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
                                                formData.rte?.isRte ? "translate-x-5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-slate-700">Scholarship Concession</h4>
                                            <p className="text-[10px] text-slate-400">Apply a fee scholarship</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                scholarship: { ...formData.scholarship, hasScholarship: !formData.scholarship?.hasScholarship }
                                            })}
                                            className={cn(
                                                "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
                                                formData.scholarship?.hasScholarship ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200",
                                                formData.scholarship?.hasScholarship ? "translate-x-5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>
                                </div>

                                {formData.rte?.isRte && (
                                    <div className="grid grid-cols-2 gap-4 animate-fade-in p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <Input
                                            label="RTE Application ID"
                                            placeholder="e.g. RTE/2026/8947"
                                            value={formData.rte?.rteDetails || ""}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                rte: { ...formData.rte, rteDetails: e.target.value }
                                            })}
                                        />
                                        <Input
                                            label="RTE Document Link"
                                            placeholder="URL to verification doc"
                                            value={formData.rte?.rteDocumentUrl || ""}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                rte: { ...formData.rte, rteDocumentUrl: e.target.value }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.scholarship?.hasScholarship && (
                                    <div className="space-y-4 animate-fade-in p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Scholarship Scheme Name"
                                                placeholder="e.g. Merit-cum-Means"
                                                value={formData.scholarship?.scholarshipName || ""}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    scholarship: { ...formData.scholarship, scholarshipName: e.target.value }
                                                })}
                                                required
                                            />
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discount Type</label>
                                                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            scholarship: { ...formData.scholarship, scholarshipType: "flat" }
                                                        })}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                                                            formData.scholarship?.scholarshipType === "flat"
                                                                ? "bg-white text-slate-800 shadow-sm"
                                                                : "text-slate-500"
                                                        )}
                                                    >
                                                        Flat Amount (₹)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            scholarship: { ...formData.scholarship, scholarshipType: "percentage" }
                                                        })}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                                                            formData.scholarship?.scholarshipType === "percentage"
                                                                ? "bg-white text-slate-800 shadow-sm"
                                                                : "text-slate-500"
                                                        )}
                                                    >
                                                        Percentage (%)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label={formData.scholarship?.scholarshipType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                                                type="number"
                                                placeholder="e.g. 20"
                                                value={formData.scholarship?.scholarshipAmount || ""}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    scholarship: { ...formData.scholarship, scholarshipAmount: parseFloat(e.target.value) || 0 }
                                                })}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white z-10 pb-2">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 shadow-lg shadow-blue-500/20">Complete Registration</Button>
                    </div>
                </form>
            </Modal>
            {/* Import Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={resetImport}
                title="Bulk Student Import & Photo Uploader"
                className={(importStatus === "preview" || (importTab === "existing_photos" && photoStudents.length > 0)) ? "max-w-4xl" : "max-w-lg"}
            >
                <div className="space-y-5">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200">
                        <button
                            type="button"
                            onClick={() => setImportTab("new_students")}
                            className={cn(
                                "flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-colors",
                                importTab === "new_students"
                                    ? "border-premium-blue text-premium-blue font-bold"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            1. New Students (Excel Import)
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportTab("existing_photos")}
                            className={cn(
                                "flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-colors",
                                importTab === "existing_photos"
                                    ? "border-premium-blue text-premium-blue font-bold"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            )}
                        >
                            2. Existing Students (Class Photos)
                        </button>
                    </div>

                    {/* TAB 1: NEW STUDENTS BULK IMPORT */}
                    {importTab === "new_students" && (
                        <div className="space-y-5">
                            {importStatus === "idle" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label={isSchool ? "Target Class" : "Target Course"}
                                            value={importCourseId}
                                            onChange={(val) => { setImportCourseId(val); setImportBatchId(""); }}
                                            options={[
                                                { label: "Select...", value: "" },
                                                ...courses.map(c => ({ label: c.name, value: c._id }))
                                            ]}
                                        />
                                        <Select
                                            label={isSchool ? "Target Section" : "Target Batch"}
                                            value={importBatchId}
                                            onChange={(val) => setImportBatchId(val)}
                                            options={[
                                                { label: "Select...", value: "" },
                                                ...batches
                                                    .filter(b => {
                                                        const matchesCourse = b.course === importCourseId || b.course?._id === importCourseId;
                                                        const matchesSession = !selectedSessionId || (b.session === selectedSessionId || b.session?._id === selectedSessionId || !b.session);
                                                        return matchesCourse && matchesSession;
                                                    })
                                                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                                    .map(b => ({ label: b.name, value: b._id }))
                                            ]}
                                            disabled={!importCourseId}
                                        />
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <FileSpreadsheet className="mx-auto text-premium-blue mb-2" size={32} />
                                        <h3 className="text-sm font-bold text-slate-800">Upload Excel File</h3>
                                        <p className="text-xs text-slate-500 mt-1 mb-4">
                                            Select the .xlsx file containing student records.
                                            <br />
                                            <a href="/api/v1/students/template" target="_blank" className="text-premium-blue hover:underline font-bold">Download Template</a>
                                        </p>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={(e) => setImportFile(e.target.files[0])}
                                            className="block w-full text-sm text-slate-500
                                              file:mr-4 file:py-2 file:px-4
                                              file:rounded-full file:border-0
                                              file:text-xs file:font-semibold
                                              file:bg-premium-blue file:text-white
                                              hover:file:bg-premium-blue/90
                                              cursor-pointer
                                            "
                                        />
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <ImageIcon className="mx-auto text-slate-600 mb-2" size={30} />
                                        <h3 className="text-sm font-bold text-slate-800">Student Photos Folder (Optional)</h3>
                                        <p className="text-xs text-slate-500 mt-1 mb-3">
                                            Select a folder of student photos. Matched by Photo No, Admission No, Roll No, or Name.
                                        </p>
                                        {photoFilesCount > 0 && (
                                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg w-fit mx-auto mb-3">
                                                <FolderCheck size={16} /> {photoFilesCount} Photos Loaded
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            webkitdirectory=""
                                            directory=""
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoFolderSelect}
                                            className="block w-full text-sm text-slate-500
                                              file:mr-4 file:py-2 file:px-4
                                              file:rounded-full file:border-0
                                              file:text-xs file:font-semibold
                                              file:bg-slate-800 file:text-white
                                              hover:file:bg-slate-700
                                              cursor-pointer"
                                        />
                                    </div>

                                    {importFile && (
                                        <Button onClick={handleUploadAndPreview} className="w-full" disabled={!importFile || !importBatchId}>
                                            <Upload className="mr-2" size={16} />
                                            Upload & Preview
                                        </Button>
                                    )}
                                </div>
                            )}

                            {importStatus === "uploading" && (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <LoadingSpinner />
                                    <p className="text-sm font-bold text-slate-600 mt-4">Validating Spreadsheet...</p>
                                    <p className="text-xs text-slate-400">Performing dry-run check on student records.</p>
                                </div>
                            )}

                            {importStatus === "uploading_photos" && (
                                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                                    <LoadingSpinner />
                                    <p className="text-sm font-bold text-slate-700">Uploading & Optimizing Student Photos...</p>
                                    {photoUploadProgress && (
                                        <div className="w-full max-w-xs space-y-1.5">
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${photoUploadProgress.percent}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-center font-medium text-slate-500">
                                                {photoUploadProgress.completed} of {photoUploadProgress.total} uploaded ({photoUploadProgress.percent}%)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {importStatus === "importing" && (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <LoadingSpinner />
                                    <p className="text-sm font-bold text-slate-600 mt-4">Importing Students...</p>
                                    <p className="text-xs text-slate-400">Writing records to database. Please do not close this window.</p>
                                </div>
                            )}

                            {importStatus === "preview" && importResult && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">Pre-Import Summary</h4>
                                            <p className="text-xs text-slate-500">Please review validation results before confirming.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                                Total: {importResult.totalRows}
                                            </span>
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                                                Valid: {importResult.validRows}
                                            </span>
                                            {photoFilesCount > 0 && (
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                                    Photos: {Object.keys(matchedPhotos).length}/{importResult.validRows}
                                                </span>
                                            )}
                                            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100">
                                                Errors: {importResult.invalidRows}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="max-h-[350px] overflow-y-auto border border-slate-200 rounded-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">Row</th>
                                                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20">Photo</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Name</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admission ID</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Infrastructure Status / Errors</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {importResult.rows.map((row, idx) => {
                                                    const rowKey = row.rowIdx !== undefined ? row.rowIdx : idx;
                                                    const matchedFile = matchedPhotos[rowKey];
                                                    return (
                                                        <tr 
                                                            key={idx} 
                                                            className={cn(
                                                                "transition-colors",
                                                                row.isValid 
                                                                    ? "hover:bg-slate-50/50" 
                                                                    : "bg-red-50/50 hover:bg-red-50 text-red-900 border-l-4 border-l-red-500"
                                                            )}
                                                        >
                                                            <td className="px-3 py-3 text-xs font-mono text-slate-500 align-top">{row.row}</td>
                                                            <td className="px-3 py-3 align-top">
                                                                {matchedFile ? (
                                                                    <div className="flex items-center gap-1.5" title={matchedFile.name}>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img 
                                                                            src={URL.createObjectURL(matchedFile)} 
                                                                            alt="avatar" 
                                                                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                                                        />
                                                                        <span className="text-[9px] font-mono text-slate-500 truncate max-w-[50px]">
                                                                            {matchedFile.name}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-300 italic">None</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs font-bold align-top">
                                                                {row.studentName}
                                                                {row.phone && row.phone !== "N/A" && (
                                                                    <span className="block text-[10px] font-medium text-slate-400 mt-0.5">{row.phone}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs font-mono text-slate-600 align-top">{row.admissionNo}</td>
                                                            <td className="px-4 py-3 text-xs font-medium text-slate-600 align-top">{row.className}</td>
                                                            <td className="px-4 py-3 text-xs align-top">
                                                                {row.isValid ? (
                                                                    <div className="space-y-1">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                            <CheckCircle size={10} /> Valid
                                                                        </span>
                                                                        {row.batchStatus && row.batchStatus !== "Ok" && (
                                                                            <span className="block text-[10px] font-medium text-amber-600">
                                                                                💡 {row.batchStatus}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-1 text-red-600">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                                                            <AlertCircle size={10} /> Invalid
                                                                        </span>
                                                                        <ul className="list-disc list-inside text-[10px] font-semibold space-y-0.5 mt-1">
                                                                            {row.errors.map((err, errIdx) => (
                                                                                <li key={errIdx}>{err}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button onClick={() => setImportStatus("idle")} variant="outline" className="flex-1">
                                            Cancel & Re-upload
                                        </Button>
                                        <Button 
                                            onClick={handleConfirmImport} 
                                            className="flex-1" 
                                            disabled={importResult.validRows === 0}
                                        >
                                            <Upload className="mr-2" size={16} />
                                            Confirm Import ({importResult.validRows} Students)
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {importStatus === "success" && importResult && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center">
                                            <CheckCircle className="text-emerald-500 mb-1" size={24} />
                                            <span className="text-2xl font-black text-emerald-800">{importResult.successCount}</span>
                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Imported</span>
                                        </div>
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center">
                                            <X className="text-red-500 mb-1" size={24} />
                                            <span className="text-2xl font-black text-red-800">{importResult.failedCount}</span>
                                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Failed</span>
                                        </div>
                                    </div>

                                    {importResult.failedCount > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Error Report</h4>
                                            <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase w-16">Row</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Input</th>
                                                            <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Reason</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white">
                                                        {importResult.errors.map((err, idx) => (
                                                            <tr key={idx} className="hover:bg-red-50/50">
                                                                <td className="px-3 py-2 text-xs font-mono text-slate-500">{err.row}</td>
                                                                <td className="px-3 py-2 text-xs font-medium text-slate-700">{err.identifier}</td>
                                                                <td className="px-3 py-2 text-xs font-bold text-red-600">{err.reason}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Button onClick={resetImport} variant="outline" className="w-full">
                                            Close & Refresh
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {importStatus === "error" && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center text-center">
                                        <AlertCircle className="text-red-500 mb-2" size={32} />
                                        <h3 className="text-lg font-bold text-red-800">Import Failed</h3>
                                        <p className="text-sm font-medium text-red-600 mt-1">
                                            The file could not be processed. Please check the format and try again.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <Button onClick={() => setImportStatus("idle")} variant="outline" className="w-full">
                                            Try Again
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: EXISTING STUDENTS CLASS-WISE PHOTO UPLOADER */}
                    {importTab === "existing_photos" && (
                        <div className="space-y-4">
                            {photoStatus === "idle" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label={isSchool ? "Select Class *" : "Select Course *"}
                                            value={photoCourseId}
                                            onChange={(val) => { setPhotoCourseId(val); setPhotoBatchId(""); setPhotoStudents([]); }}
                                            options={[
                                                { label: "Select...", value: "" },
                                                ...courses.map(c => ({ label: c.name, value: c._id }))
                                            ]}
                                        />
                                        <Select
                                            label={isSchool ? "Select Section *" : "Select Batch *"}
                                            value={photoBatchId}
                                            onChange={(val) => {
                                                setPhotoBatchId(val);
                                                fetchClassStudents(val);
                                            }}
                                            options={[
                                                { label: "Select...", value: "" },
                                                ...batches
                                                    .filter(b => {
                                                        const matchesCourse = b.course === photoCourseId || b.course?._id === photoCourseId;
                                                        const matchesSession = !selectedSessionId || (b.session === selectedSessionId || b.session?._id === selectedSessionId || !b.session);
                                                        return matchesCourse && matchesSession;
                                                    })
                                                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                                    .map(b => ({ label: b.name, value: b._id }))
                                            ]}
                                            disabled={!photoCourseId}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Step 1: Download Class Photo Sheet */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Download className="text-premium-blue" size={18} />
                                                    <h3 className="text-xs font-bold text-slate-800">1. Download Class Photo Sheet</h3>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mb-3">
                                                    Download pre-populated Excel sheet containing all enrolled students with an empty Photo No column.
                                                </p>
                                            </div>
                                            {photoBatchId ? (
                                                <a
                                                    href={`/api/v1/students/photo-template?batchId=${photoBatchId}`}
                                                    download
                                                    className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-white border border-slate-200 hover:border-premium-blue text-premium-blue rounded-lg text-xs font-bold shadow-sm transition-all"
                                                >
                                                    <FileSpreadsheet size={15} /> Download Sheet (.xlsx)
                                                </a>
                                            ) : (
                                                <Button disabled size="sm" variant="outline" className="w-full text-xs">
                                                    Select {isSchool ? "Section" : "Batch"} First
                                                </Button>
                                            )}
                                        </div>

                                        {/* Step 2: Upload Edited Excel (Optional) */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <FileSpreadsheet className="text-emerald-600" size={18} />
                                                    <h3 className="text-xs font-bold text-slate-800">2. Upload Edited Sheet (Optional)</h3>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mb-3">
                                                    If you filled custom Photo Numbers in the Excel sheet, select it here to auto-apply.
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                onChange={handlePhotoExcelSelect}
                                                disabled={!photoBatchId}
                                                className="block w-full text-xs text-slate-500
                                                  file:mr-2 file:py-1.5 file:px-3
                                                  file:rounded-md file:border-0
                                                  file:text-xs file:font-semibold
                                                  file:bg-emerald-600 file:text-white
                                                  hover:file:bg-emerald-700
                                                  cursor-pointer disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Step 3: Select Photos Folder */}
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <ImageIcon className="mx-auto text-slate-700 mb-1.5" size={28} />
                                        <h3 className="text-xs font-bold text-slate-800">3. Select Student Photos Folder *</h3>
                                        <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                                            Select the folder containing student photos. Matched by Photo No, Roll No, Admission No, or Name.
                                        </p>
                                        {photoFilesCount > 0 && (
                                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 py-1 px-3 rounded-lg w-fit mx-auto mb-2.5">
                                                <FolderCheck size={15} /> {photoFilesCount} Photos Loaded from Folder
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            webkitdirectory=""
                                            directory=""
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoFolderSelect}
                                            className="block w-full text-xs text-slate-500
                                              file:mr-4 file:py-2 file:px-4
                                              file:rounded-full file:border-0
                                              file:text-xs file:font-semibold
                                              file:bg-slate-900 file:text-white
                                              hover:file:bg-slate-800
                                              cursor-pointer"
                                        />
                                    </div>

                                    {/* Student Matching Table */}
                                    {photoLoading ? (
                                        <div className="p-8 text-center">
                                            <LoadingSpinner />
                                            <p className="text-xs font-bold text-slate-500 mt-2">Loading enrolled students...</p>
                                        </div>
                                    ) : photoStudents.length > 0 && (
                                        <div className="space-y-3 pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                        Enrolled Students ({photoStudents.length})
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">Review matched photos before saving</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                                        Total: {photoStudents.length}
                                                    </span>
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                                        Matched: {Object.keys(matchedExistingPhotos).length} / {photoStudents.length}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase w-20">Roll No</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase w-20">Photo No</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Student Name</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Admission / ID</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Current Photo</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">New Photo</th>
                                                            <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-100">
                                                        {photoStudents.map((s) => {
                                                            const matchedFile = matchedExistingPhotos[s.studentId];
                                                            return (
                                                                <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-3 py-2 text-xs font-mono font-bold text-slate-700">{s.rollNo || "-"}</td>
                                                                    <td className="px-3 py-2 text-xs font-mono font-bold text-blue-600">{s.photoNo || "-"}</td>
                                                                    <td className="px-3 py-2 text-xs font-bold text-slate-900">{s.studentName}</td>
                                                                    <td className="px-3 py-2 text-xs font-mono text-slate-500">{s.admissionNo || "-"}</td>
                                                                    <td className="px-3 py-2">
                                                                        {s.currentAvatar ? (
                                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                                            <img src={s.currentAvatar} alt="current avatar" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-300 italic">None</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {matchedFile ? (
                                                                            <div className="flex items-center gap-1.5" title={matchedFile.name}>
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img src={URL.createObjectURL(matchedFile)} alt="new avatar" className="w-7 h-7 rounded-full object-cover border-2 border-emerald-400" />
                                                                                <span className="text-[9px] font-mono text-slate-600 truncate max-w-[70px]">{matchedFile.name}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-300 italic">No Match</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {matchedFile ? (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                                <CheckCircle size={10} /> Matched
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                                                                Pending
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <Button
                                                onClick={handleConfirmExistingPhotosUpload}
                                                className="w-full shadow-md shadow-blue-500/10"
                                                disabled={Object.keys(matchedExistingPhotos).length === 0}
                                            >
                                                <Upload className="mr-2" size={16} />
                                                Upload & Save {Object.keys(matchedExistingPhotos).length} Matched Photos
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {photoStatus === "uploading_photos" && (
                                <div className="flex flex-col items-center justify-center p-8 space-y-3">
                                    <LoadingSpinner />
                                    <p className="text-sm font-bold text-slate-700">Compressing & Uploading Student Photos...</p>
                                    {photoUploadProgress && (
                                        <div className="w-full max-w-xs space-y-1.5">
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${photoUploadProgress.percent}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-center font-medium text-slate-500">
                                                {photoUploadProgress.completed} of {photoUploadProgress.total} uploaded ({photoUploadProgress.percent}%)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {photoStatus === "updating_db" && (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <LoadingSpinner />
                                    <p className="text-sm font-bold text-slate-600 mt-4">Saving Photos to Student Profiles...</p>
                                    <p className="text-xs text-slate-400">Updating database records. Please wait.</p>
                                </div>
                            )}

                            {photoStatus === "success" && photoUpdateResult && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center text-center">
                                        <CheckCircle className="text-emerald-500 mb-2" size={36} />
                                        <h3 className="text-lg font-black text-emerald-800">Photos Updated Successfully!</h3>
                                        <p className="text-xs font-semibold text-emerald-600 mt-1">
                                            Saved profile photos for {photoUpdateResult.successCount} students in this class.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <Button onClick={resetImport} variant="outline" className="w-full">
                                            Close & Refresh
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {photoStatus === "error" && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center text-center">
                                        <AlertCircle className="text-red-500 mb-2" size={32} />
                                        <h3 className="text-lg font-bold text-red-800">Photo Upload Failed</h3>
                                        <p className="text-sm font-medium text-red-600 mt-1">
                                            An error occurred while uploading or saving photos. Please try again.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <Button onClick={() => setPhotoStatus("idle")} variant="outline" className="w-full">
                                            Try Again
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div >
    );
}

function PromotionModalContent({ batches, courses, sessions, selectedCount, onPromote, onClose, isSchool, isCollege }) {
    const [targetSessionId, setTargetSessionId] = useState("");
    const [targetCourseId, setTargetCourseId] = useState("");
    const [targetBatchId, setTargetBatchId] = useState("");
    const [isPromoting, setIsPromoting] = useState(false);

    const handlePromote = async () => {
        if (!targetBatchId) return;
        setIsPromoting(true);
        await onPromote(targetBatchId);
        setIsPromoting(false);
    };

    const filteredBatches = batches
        .filter(b => b.course?._id === targetCourseId || b.course === targetCourseId)
        .filter(b => (isSchool || isCollege) && targetSessionId ? (b.session === targetSessionId || b.session?._id === targetSessionId) : true)
        .sort((a, b) => (a.semester || 1) - (b.semester || 1) || (a.name || "").localeCompare(b.name || ""));

    return (
        <div className="space-y-6 py-2">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Users size={20} />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800">{selectedCount} Students Selected</p>
                    <p className="text-[11px] text-slate-500 font-medium">Select the target {isCollege ? "Degree Program" : isSchool ? "Class" : "Course"} and {isCollege || isSchool ? "Section" : "Batch"} for promotion.</p>
                </div>
            </div>

            <div className="space-y-4">
                {(isSchool || isCollege) && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Target Academic Session</label>
                        <Select
                            value={targetSessionId}
                            onChange={(val) => {
                                setTargetSessionId(val);
                                setTargetBatchId("");
                            }}
                            placeholder="Select Target Session..."
                            options={[
                                { label: "Select Target Session", value: "" },
                                ...sessions.map(s => ({ label: s.sessionName, value: s._id }))
                            ]}
                        />
                    </div>
                )}
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 ml-1">Target {isCollege ? "Degree Program / Course" : isSchool ? "Class" : "Course"}</label>
                    <Select
                        value={targetCourseId}
                        onChange={(val) => {
                            setTargetCourseId(val);
                            setTargetBatchId("");
                        }}
                        placeholder={`Select ${isCollege ? "Degree Program" : isSchool ? "Class" : "Course"}...`}
                        options={[
                            { label: `Select ${isCollege ? "Degree Program" : isSchool ? "Class" : "Course"}`, value: "" },
                            ...courses.map(c => ({ label: c.name, value: c._id }))
                        ]}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 ml-1">Target {isCollege || isSchool ? "Section" : "Batch"}</label>
                    <Select
                        value={targetBatchId}
                        onChange={setTargetBatchId}
                        disabled={!targetCourseId}
                        placeholder={`Select ${isCollege || isSchool ? "Section" : "Batch"}...`}
                        options={[
                            { label: `Select ${isCollege || isSchool ? "Section" : "Batch"}`, value: "" },
                            ...filteredBatches.map(b => ({
                                label: isCollege && b.semester ? `Sem ${b.semester} - ${b.name}` : b.name,
                                value: b._id
                            }))
                        ]}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                <Button 
                    onClick={handlePromote} 
                    disabled={!targetBatchId || isPromoting} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                    {isPromoting ? "Promoting..." : "Confirm Promotion"}
                </Button>
            </div>
        </div>
    );
}
