"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import TemplatesTab from "./idcard/TemplatesTab";
import GenerateTab from "./idcard/GenerateTab";

export default function IDCardManager() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState("templates");

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("templates")}
                    className={cn(
                        "px-4 py-3 font-semibold border-b-2 whitespace-nowrap transition-colors",
                        activeTab === "templates"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                >
                    Templates
                </button>
                <button
                    onClick={() => setActiveTab("generate")}
                    className={cn(
                        "px-4 py-3 font-semibold border-b-2 whitespace-nowrap transition-colors",
                        activeTab === "generate"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                >
                    Generate Cards
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                        "px-4 py-3 font-semibold border-b-2 whitespace-nowrap transition-colors",
                        activeTab === "history"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-slate-600 hover:text-slate-900"
                    )}
                >
                    History
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "templates" && <TemplatesTab />}
            {activeTab === "generate" && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Generate ID Cards</h1>
                        <p className="text-slate-600 mt-1">Bulk generate front and back images for students</p>
                    </div>
                    <GenerateTab />
                </div>
            )}
            {activeTab === "history" && (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Card History</h1>
                        <p className="text-slate-600 mt-1">View and re-download generated cards</p>
                    </div>
                    <Card className="p-6">
                        <p className="text-slate-500">Coming soon...</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
