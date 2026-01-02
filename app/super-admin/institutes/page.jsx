"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import { useSession } from "next-auth/react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function InstitutesPage() {
    const toast = useToast();
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Action State
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    useEffect(() => {
        fetchInstitutes();
    }, []);

    const fetchInstitutes = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch("/api/v1/institutes", {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes:", error);
            toast.error("Failed to load institutes");
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!selectedInstitute) return;
        setActionLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const newStatus = selectedInstitute.status === 'suspended' ? 'active' : 'suspended';
            const res = await fetch(`/api/v1/institutes/${selectedInstitute._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
                signal: controller.signal
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update status");
            }

            // Update local state
            setInstitutes(prev => prev.map(inst =>
                inst._id === selectedInstitute._id ? { ...inst, status: newStatus } : inst
            ));
            toast.success(`Institute ${newStatus === 'active' ? 'Activated' : 'Suspended'} Successfully`);
            setIsSuspendOpen(false);
        } catch (error) {
            if (error.name === 'AbortError') {
                toast.error("Request timed out. Please try again.");
            } else {
                toast.error(error.message || "Failed to update status");
            }
        } finally {
            clearTimeout(timeoutId);
            setActionLoading(false);
            setSelectedInstitute(null);
        }
    };

    const handleDelete = async () => {
        if (!selectedInstitute) return;
        setActionLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const res = await fetch(`/api/v1/institutes/${selectedInstitute._id}`, {
                method: "DELETE",
                signal: controller.signal
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to delete institute");
            }

            // Remove from local state
            setInstitutes(prev => prev.filter(inst => inst._id !== selectedInstitute._id));
            toast.success("Institute Deleted Successfully (Soft Delete)");
            setIsDeleteOpen(false);
        } catch (error) {
            if (error.name === 'AbortError') {
                toast.error("Request timed out. Please try again.");
            } else {
                toast.error(error.message || "Failed to delete institute");
            }
        } finally {
            clearTimeout(timeoutId);
            setActionLoading(false);
            setSelectedInstitute(null);
        }
    };

    const openSuspendModal = (inst) => {
        setSelectedInstitute(inst);
        setIsSuspendOpen(true);
    };

    const openDeleteModal = (inst) => {
        setSelectedInstitute(inst);
        setIsDeleteOpen(true);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Institutes</h1>
                <Link href="/super-admin/institutes/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    + Add Institute
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {institutes.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <p className="text-lg font-medium text-gray-900 mb-1">No institutes found</p>
                                        <p className="text-sm text-gray-500 mb-4">Get started by creating a new institute.</p>
                                        <Link href="/super-admin/institutes/create" className="text-blue-600 hover:text-blue-800 font-medium">
                                            Create Institute &rarr;
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {institutes.map((inst) => (
                            <tr key={inst._id || inst.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{inst.name || 'N/A'}</div>
                                    <div className="text-sm text-gray-500">{inst.contactEmail || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                        {inst.code || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {inst.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                    {inst.subscription?.plan || 'Free'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {inst.usage?.studentCount || 0} Students
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3">
                                        <Link
                                            href={`/super-admin/institutes/${inst._id}/edit`}
                                            className={`text-blue-600 hover:text-blue-900 ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={(e) => actionLoading && e.preventDefault()}
                                            aria-disabled={actionLoading}
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => openSuspendModal(inst)}
                                            disabled={actionLoading}
                                            className={`text-orange-600 hover:text-orange-900 ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            aria-disabled={actionLoading}
                                        >
                                            {inst.status === 'suspended' ? 'Activate' : 'Suspend'}
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(inst)}
                                            disabled={actionLoading}
                                            className={`text-red-600 hover:text-red-900 ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            aria-disabled={actionLoading}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Suspend Confirmation */}
            <ConfirmDialog
                isOpen={isSuspendOpen}
                title={selectedInstitute?.status === 'suspended' ? "Activate Institute" : "Suspend Institute"}
                message={selectedInstitute?.status === 'suspended'
                    ? "Are you sure you want to activate this institute? Users will be able to log in again."
                    : "Are you sure you want to suspend this institute? Users will not be able to log in until reactivated."}
                onConfirm={handleSuspend}
                onCancel={() => setIsSuspendOpen(false)}
                type={selectedInstitute?.status === 'suspended' ? "info" : "danger"}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isDeleteOpen}
                title="Delete Institute"
                message="Are you sure you want to delete this institute? This action will hide the institute but retain data."
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteOpen(false)}
                type="danger"
            />
        </div>
    );
}
