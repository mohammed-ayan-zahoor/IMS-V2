"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bus, Route, Car, UserCheck, CreditCard, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import RoutesTab from "@/components/admin/transport/RoutesTab";
import VehiclesTab from "@/components/admin/transport/VehiclesTab";
import DriversTab from "@/components/admin/transport/DriversTab";
import FeePresetsTab from "@/components/admin/transport/FeePresetsTab";
import ReportsTab from "@/components/admin/transport/ReportsTab";

const TABS = [
    { id: "routes", label: "Routes", icon: Route },
    { id: "vehicles", label: "Vehicles", icon: Car },
    { id: "drivers", label: "Drivers", icon: UserCheck },
    { id: "fee-presets", label: "Fee Presets", icon: CreditCard },
    { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function TransportPage() {
    const [activeTab, setActiveTab] = useState("routes");
    const [viewMode, setViewMode] = useState("card");
    const { data: session } = useSession();

    return (
        <div className="space-y-6">
            {/* Tab Navigation & View Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto flex-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-premium-blue text-white shadow-sm shadow-blue-500/20"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* View Mode Toggle (Card vs Table) */}
                {activeTab !== "reports" && (
                    <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm shrink-0 self-end sm:self-auto">
                        <button
                            onClick={() => setViewMode("card")}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                viewMode === "card"
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            Card
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                viewMode === "table"
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            Table
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === "routes" && <RoutesTab viewMode={viewMode} />}
                {activeTab === "vehicles" && <VehiclesTab viewMode={viewMode} />}
                {activeTab === "drivers" && <DriversTab viewMode={viewMode} />}
                {activeTab === "fee-presets" && <FeePresetsTab viewMode={viewMode} />}
                {activeTab === "reports" && <ReportsTab />}
            </div>
        </div>
    );
}
