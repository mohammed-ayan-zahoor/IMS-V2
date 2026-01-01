"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function CreateInstitutePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        adminEmail: "",
        adminPassword: "",
        adminName: "",
        contactPhone: "",
        addressStr: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === "code" ? value.toUpperCase() : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/v1/institutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType?.includes("application/json")) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to create institute");
                } else {
                    throw new Error("Failed to create institute");
                }
            }

            const data = await res.json();
            toast.success("Institute Created Successfully!");
            router.push("/super-admin/institutes");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Create New Institute</h1>
                <Link href="/super-admin/institutes" className="text-gray-600 hover:text-gray-900">
                    Cancel
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">

                <h3 className="text-lg font-medium border-b pb-2">Institute Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Institute Name *</label>
                        <input name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Institute Code * (Unique)</label>
                        <input name="code" required value={formData.code} onChange={handleChange} className="mt-1 block w-full border rounded p-2 uppercase" placeholder="e.g. IMS_DELHI" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                        <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea name="addressStr" value={formData.addressStr} onChange={handleChange} className="mt-1 block w-full border rounded p-2" rows="2" />
                    </div>
                </div>
                <h3 className="text-lg font-medium border-b pb-2 pt-4">Admin Account</h3>
                <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 mb-4">
                    This will create the initial Admin user for the institute.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Admin Name</label>
                        <input name="adminName" value={formData.adminName} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Admin Email *</label>
                        <input name="adminEmail" type="email" required value={formData.adminEmail} onChange={handleChange} className="mt-1 block w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Admin Password *</label>
                        <input name="adminPassword" type="password" required value={formData.adminPassword} onChange={handleChange} className="mt-1 block w-full border rounded p-2" minLength={6} />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Institute & Admin"}
                    </button>
                </div>
            </form>
        </div>
    );
}
