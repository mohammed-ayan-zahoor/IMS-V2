"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import QRCode from "qrcode";

export default function IDCardPage() {
    const { id } = useParams();
    const router = useRouter();

    const [student, setStudent] = useState(null);
    const [qrUrl, setQrUrl] = useState("");

    useEffect(() => {
        fetch(`/api/v1/students/${id}`)
            .then(r => r.json())
            .then(d => setStudent(d?.student || d))
            .catch(() => {});
    }, [id]);

    useEffect(() => {
        if (!student) return;
        const payload = `STU:${student.enrollmentNumber || student._id}`;
        QRCode.toDataURL(payload, { width: 300, margin: 2 })
            .then(url => setQrUrl(url))
            .catch(console.error);
    }, [student]);

    const handlePrint = () => {
        const w = window.open("", "_blank");
        if (!w) return;
        const name = `${student?.profile?.firstName || ""} ${student?.profile?.lastName || ""}`.trim();
        w.document.write(`
            <html><head><title>ID Card – ${name}</title><style>
                body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f3f4f6;}
                .card{width:320px;border-radius:12px;background:white;border:2px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);text-align:center;}
                .header{background:#4f46e5;color:white;padding:16px;font-weight:700;font-size:18px;}
                .body{padding:20px;display:flex;flex-direction:column;align-items:center;gap:8px;}
                .avatar{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #4f46e5;}
                .name{font-size:20px;font-weight:700;color:#111827;}
                .sub{font-size:12px;letter-spacing:1px;color:#6b7280;text-transform:uppercase;font-weight:600;}
                .detail{font-size:14px;color:#374151;margin-top:4px;}
                .qr{width:150px;height:150px;margin-top:8px;}
                .footer{background:#f9fafb;padding:8px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;}
            </style></head><body>
            <div class="card">
                <div class="header">IMS ACADEMY</div>
                <div class="body">
                    ${student?.profile?.avatar ? `<img class="avatar" src="${student.profile.avatar}" />` : ""}
                    <div class="name">${name}</div>
                    <div class="sub">Student</div>
                    <div class="detail"><b>Enrollment:</b> ${student?.enrollmentNumber || "N/A"}</div>
                    ${qrUrl ? `<img class="qr" src="${qrUrl}" />` : ""}
                    <div style="font-size:11px;color:#6b7280;">Scan QR for attendance</div>
                </div>
                <div class="footer">Valid for current academic year</div>
            </div>
            <script>window.onload=()=>{window.print();}</script>
            </body></html>
        `);
        w.document.close();
    };

    const name = student?.profile
        ? `${student.profile.firstName} ${student.profile.lastName}`
        : "Student";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-4 pt-8">
            {/* Back */}
            <div className="w-full max-w-sm mb-4">
                <button
                    onClick={() => router.push(`/admin/students/${id}`)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to {name}
                </button>
            </div>

            {/* ID Card preview */}
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4 text-center">
                    <p className="text-indigo-200 text-xs font-semibold tracking-widest uppercase">IMS Academy</p>
                    <p className="text-white text-lg font-bold mt-1">Student ID Card</p>
                </div>

                <div className="p-6 flex flex-col items-center gap-4">
                    {student?.profile?.avatar && (
                        <img
                            src={student.profile.avatar}
                            alt={name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 shadow"
                        />
                    )}

                    <div className="text-center">
                        <p className="text-xl font-bold text-slate-800">{name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">Student</p>
                    </div>

                    <div className="w-full bg-slate-50 rounded-xl p-3 text-center text-sm text-slate-600">
                        <span className="font-semibold">Enrollment:</span>{" "}
                        {student?.enrollmentNumber || "—"}
                    </div>

                    {/* QR Code */}
                    {qrUrl ? (
                        <div className="flex flex-col items-center gap-2">
                            <img
                                src={qrUrl}
                                alt="Attendance QR"
                                className="w-44 h-44 border border-slate-200 rounded-xl p-1 bg-white shadow-sm"
                            />
                            <p className="text-xs text-slate-400">Scan to mark attendance</p>
                        </div>
                    ) : (
                        <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                            Generating QR…
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6">
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={!qrUrl}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow"
                    >
                        <Printer size={16} />
                        Print ID Card
                    </button>
                </div>
            </div>
        </div>
    );
}
