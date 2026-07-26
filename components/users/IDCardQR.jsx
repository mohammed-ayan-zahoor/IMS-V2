"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Printer } from "lucide-react";

export default function IDCardQR({ user }) {
    const [qrUrl, setQrUrl] = useState("");

    const isStudent = user?.role === "student";
    const qrPayload = isStudent
        ? `STU:${user?.enrollmentNumber || user?._id}`
        : `STAFF:${user?._id}`;

    useEffect(() => {
        if (!qrPayload) return;
        QRCode.toDataURL(qrPayload, { width: 300, margin: 2 })
            .then(url => setQrUrl(url))
            .catch(err => console.error("QR Code Generation Error:", err));
    }, [qrPayload]);

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>ID Card - ${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}</title>
                    <style>
                        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f3f4f6; }
                        .card { width: 320px; height: 480px; border-radius: 12px; background: white; border: 2px solid #e5e7eb; padding: 24px; box-sizing: border-box; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: space-between; }
                        .header { background: #4f46e5; color: white; margin: -24px -24px 16px -24px; padding: 16px; border-radius: 10px 10px 0 0; font-weight: bold; font-size: 18px; }
                        .avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px auto; border: 3px solid #4f46e5; }
                        .name { font-size: 20px; font-weight: 700; color: #111827; margin: 4px 0; }
                        .role { text-transform: uppercase; font-size: 12px; letter-spacing: 1px; color: #6b7280; font-weight: 600; }
                        .details { margin: 12px 0; font-size: 14px; color: #374151; }
                        .qr-img { width: 140px; height: 140px; margin: 0 auto; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">IMS ACADEMY</div>
                        ${user?.profile?.avatar ? `<img class="avatar" src="${user.profile.avatar}" />` : ''}
                        <div>
                            <div class="name">${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}</div>
                            <div class="role">${user?.role || "STUDENT"}</div>
                        </div>
                        <div class="details">
                            ${isStudent ? `<div><b>Enrollment:</b> ${user?.enrollmentNumber || 'N/A'}</div>` : `<div><b>Email:</b> ${user?.email || 'N/A'}</div>`}
                        </div>
                        ${qrUrl ? `<img class="qr-img" src="${qrUrl}" />` : ''}
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Attendance ID QR Code
            </div>
            {qrUrl ? (
                <img src={qrUrl} alt="Attendance QR Code" className="w-36 h-36 border border-gray-200 rounded-lg bg-white p-1" />
            ) : (
                <div className="w-36 h-36 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg text-xs text-gray-500">
                    Generating...
                </div>
            )}
            <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
                <Printer className="w-3.5 h-3.5" />
                Print ID Card
            </button>
        </div>
    );
}
