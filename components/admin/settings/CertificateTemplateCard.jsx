"use client";

import { Edit, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TemplatePreviewThumb from "./TemplatePreviewThumb";

export default function CertificateTemplateCard({
    template,
    onEdit,
    onDelete
}) {
    const isHtml = template.renderMode === "HTML_TEMPLATE";

    return (
        <div
            onClick={() => onEdit(template)}
            className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col overflow-hidden cursor-pointer select-none"
        >
            {/* Preview Thumbnail */}
            <TemplatePreviewThumb template={template} />

            {/* Info & Actions */}
            <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 truncate" title={template.name}>
                            {template.name}
                        </h4>
                        <Badge
                            variant="neutral"
                            className="text-[10px] px-1.5 py-0.2 font-semibold uppercase tracking-wider shrink-0"
                        >
                            {isHtml ? "HTML" : "Image"}
                        </Badge>
                    </div>

                    <p className="text-xs text-slate-500 capitalize truncate">
                        {(template.category || "General").toLowerCase().replace(/_/g, " ")}
                        {template.pageConfig?.orientation ? ` • ${template.pageConfig.orientation}` : ""}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(template);
                        }}
                        className="flex-1 text-xs"
                    >
                        <Edit size={13} className="mr-1 text-slate-500" />
                        Edit
                    </Button>

                    <button
                        type="button"
                        aria-label={`Delete template ${template.name}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(template);
                        }}
                        className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete template"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
}
