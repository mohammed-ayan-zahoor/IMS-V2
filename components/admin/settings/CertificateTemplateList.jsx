"use client";

import { Award, AlertTriangle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/shared/EmptyState";
import CertificateTemplateCard from "./CertificateTemplateCard";

export default function CertificateTemplateList({
    templates = [],
    loading = false,
    error = null,
    onRetry,
    onEdit,
    onDelete,
    onCreateNew
}) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse"
                    >
                        <div className="w-full aspect-[4/3] bg-slate-100" />
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-slate-200 rounded-sm w-3/4" />
                            <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                            <div className="h-8 bg-slate-100 rounded-md w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-6 text-center space-y-3">
                <AlertTriangle size={24} className="mx-auto text-rose-500" />
                <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                        Failed to load certificate templates
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                        {error}
                    </p>
                </div>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        <RefreshCw size={13} className="mr-1.5" />
                        Retry
                    </Button>
                )}
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <EmptyState
                icon={Award}
                title="No certificate templates"
                description="Create your first certificate template to start issuing student certificates."
                actionLabel="Create template"
                onAction={onCreateNew}
                className="py-12 border border-dashed border-slate-200 rounded-lg bg-slate-50/40"
            />
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => (
                <CertificateTemplateCard
                    key={template._id}
                    template={template}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}
