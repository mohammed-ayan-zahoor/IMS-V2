"use client";

import { RotateCcw, UploadCloud, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";

export default function RestorePage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Restore</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Restore database from a previous backup file.</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-amber-800">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-sm">Critical Action</h4>
                    <p className="text-xs mt-1 text-amber-700/80">
                        Restoring a backup will <strong>overwrite current data</strong>. This action cannot be undone.
                        Please ensure you have a recent backup before proceeding.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-700">Restore Data</h2>
                            <p className="text-sm text-slate-400">Upload a backup file to restore.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center space-y-4 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <UploadCloud size={32} className="text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Click to Upload Backup File</h3>
                            <p className="text-slate-400 text-xs mt-1">
                                Supports .json or .bson files
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
