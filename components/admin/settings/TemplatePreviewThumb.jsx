"use client";

import { useMemo } from "react";
import Handlebars from "handlebars";
import { Award, FileText } from "lucide-react";

const PLACEHOLDER_SAMPLES = {
    studentName: "John Alexander Doe",
    surname: "Doe",
    fatherName: "Robert Doe",
    motherName: "Jane Doe",
    grNumber: "GR/2024/001",
    enrollmentNo: "STU2024-01",
    courseName: "Standard X - Secondary Education",
    issueDate: "28 Oct 2026",
    certificateNumber: "CERT-2026-0042",
    uidNo: "1234-5678-9012"
};

const SAMPLE_HYDRATED_DATA = {
    student: {
        fullName: "John Alexander Doe",
        firstName: "John",
        lastName: "Doe",
        surname: "Doe",
        grNumber: "GR/2024/001",
        enrollmentNo: "STU2024-01",
        rollNo: "24",
        fatherName: "Robert Doe",
        motherName: "Jane Doe",
        gender: "Male",
        dob: "2008-05-15",
        admissionDate: "2022-06-15",
        joiningDate: "2022-06-15",
        courseName: "Standard X",
        standard: "10th Grade",
        batch: "2025-2026",
        section: "A",
        caste: "General",
        religion: "Hindu",
        nationality: "Indian"
    },
    institute: {
        name: "SDC Degree College",
        address: "Kolar Educational Complex, Karnataka",
        phone: "+91 98765 43210",
        email: "contact@sdc.edu"
    },
    meta: {
        issueDate: "28 Oct 2026",
        certificateNumber: "CERT-2026-0042",
        academicYear: "2025-2026"
    }
};

export default function TemplatePreviewThumb({ template }) {
    const isHtml = template?.renderMode === "HTML_TEMPLATE";
    const isLandscape = template?.pageConfig?.orientation === "landscape";

    const renderedHtmlDoc = useMemo(() => {
        if (!isHtml || !template?.htmlTemplate) return null;
        try {
            const templateFn = Handlebars.compile(template.htmlTemplate);
            const bodyHtml = templateFn(SAMPLE_HYDRATED_DATA);
            return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    font-family: system-ui, -apple-system, sans-serif;
  }
  body {
    transform: scale(0.3);
    transform-origin: top left;
    width: 333%;
    height: 333%;
  }
  ${template.cssContent || ""}
</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
        } catch {
            return `<!DOCTYPE html><html><body>${template.htmlTemplate}</body></html>`;
        }
    }, [isHtml, template?.htmlTemplate, template?.cssContent]);

    return (
        <div
            className={`w-full aspect-[4/3] bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden relative select-none pointer-events-none`}
        >
            {isHtml ? (
                renderedHtmlDoc ? (
                    <div className="w-full h-full bg-white flex items-center justify-center p-2">
                        <div
                            className={`w-full h-full bg-white border border-slate-200 rounded-xs overflow-hidden shadow-2xs ${
                                isLandscape ? "aspect-[297/210]" : "aspect-[210/297]"
                            }`}
                        >
                            <iframe
                                title="Certificate Preview"
                                srcDoc={renderedHtmlDoc}
                                className="w-full h-full border-none pointer-events-none"
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-4 text-slate-400">
                        <FileText size={24} className="mx-auto mb-1 opacity-40" />
                        <span className="text-[11px] font-medium">HTML Template</span>
                    </div>
                )
            ) : template?.imageUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-2 bg-slate-50">
                    <div className="relative w-full h-full max-h-full flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={template.imageUrl}
                            alt={template.name || "Certificate template preview"}
                            className="max-w-full max-h-full object-contain shadow-2xs rounded-xs border border-slate-200"
                        />

                        {/* Sample placeholder positions */}
                        {template.placeholders &&
                            Object.entries(template.placeholders).map(([key, p]) => {
                                if (!p?.enabled) return null;
                                const sample = PLACEHOLDER_SAMPLES[key] || key;
                                return (
                                    <span
                                        key={key}
                                        className="absolute text-[8px] font-semibold text-slate-800 truncate max-w-[40%] text-center"
                                        style={{
                                            left: `${p.x}%`,
                                            top: `${p.y}%`,
                                            transform: "translate(-50%, -50%)",
                                            color: p.color || "#1e293b",
                                            fontSize: `${Math.max(6, Math.min(9, (p.fontSize || 16) * 0.3))}px`,
                                            fontWeight: p.fontWeight || "normal",
                                            fontStyle: p.fontStyle || "normal"
                                        }}
                                    >
                                        {sample}
                                    </span>
                                );
                            })}
                    </div>
                </div>
            ) : (
                <div className="text-center p-4 text-slate-400">
                    <Award size={24} className="mx-auto mb-1 opacity-40" />
                    <span className="text-[11px] font-medium">Image Template</span>
                </div>
            )}
        </div>
    );
}
