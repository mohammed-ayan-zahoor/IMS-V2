"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        institutes: 0,
        totalUsers: 0,
        activeSubscriptions: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/stats", { signal: controller.signal });
                if (!res.ok) throw new Error("Failed to load stats");
                const data = await res.json();
                setStats({
                    institutes: data.institutes || 0,
                    totalUsers: data.totalUsers || 0,
                    activeSubscriptions: data.activeSubscriptions || 0
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Stats fetch error:", error);
                    // toast.error("Failed to load dashboard stats"); // Optional: fail silently or show error
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Institutes" value={stats.institutes} icon="🏢" color="blue" />
                <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="green" />
                <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon="💳" color="purple" />            </div>

            {/* Recent Activity / Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link href="/super-admin/institutes/create" className="block w-full p-3 text-center bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                            + Create New Institute
                        </Link>
                        <Link href="/super-admin/institutes" className="block w-full p-3 text-center bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
                            View All Institutes
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">System Status</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="text-green-800 font-medium">System Operational</span>
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Database</span>
                            <span>Connected</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Version</span>
                            <span>v2.0.0 (SaaS)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${colors[color]}`}>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    )
}
