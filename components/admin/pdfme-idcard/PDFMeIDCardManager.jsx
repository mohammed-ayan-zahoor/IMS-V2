"use client";

import { useState } from "react";
import TemplatesTab from "./TemplatesTab";
import GenerateTab from "./GenerateTab";
import { cn } from "@/lib/utils";

export default function PDFMeIDCardManager() {
    const [activeTab, setActiveTab] = useState("templates");

    return (
        <div className="w-full min-w-0 space-y-6">
            {/* Header Block with Premium Deep Blue Gradient */}
            <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-blue-950 p-6 rounded-3xl text-white shadow-lg border border-slate-800/50 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                        Vector ID Card Suite (PDFMe)
                    </h1>
                    <p className="text-blue-200/80 text-sm font-medium">
                        Design and bulk generate pixel-perfect vector ID cards in PDF format.
                    </p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 border-b border-slate-200/80 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveTab("templates")}
                    className={cn(
                        "px-6 py-3 font-bold text-sm rounded-t-2xl transition-all relative outline-none",
                        activeTab === "templates"
                            ? "text-blue-600 bg-slate-50 border-t border-x border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                    )}
                >
                    Templates Designer
                    {activeTab === "templates" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("generate")}
                    className={cn(
                        "px-6 py-3 font-bold text-sm rounded-t-2xl transition-all relative outline-none",
                        activeTab === "generate"
                            ? "text-blue-600 bg-slate-50 border-t border-x border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                    )}
                >
                    Bulk Roster Generator
                    {activeTab === "generate" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="w-full min-w-0 transition-all duration-300">
                {activeTab === "templates" && <TemplatesTab />}
                {activeTab === "generate" && <GenerateTab />}
            </div>
        </div>
    );
}
