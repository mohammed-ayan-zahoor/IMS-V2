"use client";

import { Save, Database, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";

export default function BackupPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Backup</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Create and manage system database backups.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-700">Database Backup</h2>
                            <p className="text-sm text-slate-400">Create a full snapshot of the current database.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <Save size={32} className="text-premium-blue" />
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Ready to Backup</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                                This process will create a downloadable JSON/BSON dump of all collections.
                            </p>
                        </div>
                        <Button className="bg-premium-blue text-white shadow-premium-blue/20">
                            Start Backup
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
