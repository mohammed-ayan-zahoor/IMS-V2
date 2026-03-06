"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Shield, Building2, MoreVertical, X, Check, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminManagementPage() {
    const [users, setUsers] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [memberships, setMemberships] = useState([]);
    const [createFormData, setCreateFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "admin",
        instituteId: ""
    }); const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [uRes, iRes] = await Promise.all([
                fetch("/api/v1/users?role=admin"), // Start with admins, we can expand
                fetch("/api/v1/institutes")
            ]);

            if (!uRes.ok || !iRes.ok) {
                throw new Error("Failed to Fetch data");
            }

            const uData = await uRes.json();
            const iData = await iRes.json();

            setUsers(uData.users || []);
            setInstitutes(iData.institutes || []);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberships = async (userId) => {
        try {
            const res = await fetch(`/api/v1/users/${userId}/memberships`);
            if (!res.ok) throw new Error("Failed to load memberships");
            const data = await res.json();
            setMemberships(data.memberships || []);
        } catch (error) {
            toast.error("Failed to load memberships");
        }
    };
    const handleManageAccess = (user) => {
        setSelectedUser(user);
        fetchMemberships(user._id);
        setIsModalOpen(true);
    };

    const handleAddMembership = async (instituteId) => {
        try {
            const res = await fetch(`/api/v1/users/${selectedUser._id}/memberships`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instituteId, role: 'admin' })
            });
            if (!res.ok) throw new Error("Failed to add access");
            fetchMemberships(selectedUser._id);
            toast.success("Access granted");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRemoveMembership = async (instituteId) => {
        try {
            const res = await fetch(`/api/v1/users/${selectedUser._id}/memberships?instituteId=${instituteId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to revoke access");
            setMemberships(prev => prev.filter(m => m.institute?._id !== instituteId));
            toast.success("Access revoked");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/v1/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createFormData)
            });

            if (res.ok) {
                toast.success("Administrator registered successfully");
                setIsCreateModalOpen(false);
                setCreateFormData({
                    firstName: "", lastName: "", email: "", phone: "",
                    password: "", role: "admin", instituteId: ""
                });
                fetchData();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to register admin");
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${u.profile?.firstName} ${u.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 p-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Admin Management</h1>
                    <p className="text-slate-500 font-medium">Manage global administrators and their institute access.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-12 px-6 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <UserPlus size={18} className="mr-2" /> Register Admin
                    </Button>
                    <div className="relative group min-w-[300px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" />
                        <input
                            type="text"
                            placeholder="Search admins..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Administrator</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Role</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Account Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                            <tr key={user._id} className="hover:bg-slate-50/50 group transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                            {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-none mb-1">
                                                {user.profile?.firstName} {user.profile?.lastName}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        <Shield size={12} strokeWidth={3} />
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", user.isActive ? "bg-emerald-500" : "bg-slate-300")} />
                                        <span className="text-sm font-bold text-slate-600">{user.isActive ? "Active" : "Inactive"}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <Button
                                        onClick={() => handleManageAccess(user)}
                                        variant="outline"
                                        className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest border-slate-200 hover:border-blue-600 hover:text-blue-600"
                                    >
                                        Manage Access
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Access Management Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white"
                        >
                            <div className="p-10">
                                <header className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Access</h2>
                                        <p className="text-slate-500 font-medium">{selectedUser?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </header>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Authorized Institutes</h3>
                                        <div className="space-y-3">
                                            {memberships.filter(m => m.institute).map(m => (
                                                <div key={m._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{m.institute.name}</p>
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{m.institute.code}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveMembership(m.institute._id)}
                                                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-600 transition-all"
                                                        title="Revoke Access"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                            {memberships.length === 0 && (
                                                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-[32px]">
                                                    <p className="text-slate-400 font-bold text-sm">No specific institute access granted.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Grant New Access</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                                            {institutes.filter(inst => !memberships.some(m => m.institute?._id === inst._id)).map(inst => (
                                                <button
                                                    key={inst._id}
                                                    onClick={() => handleAddMembership(inst._id)}
                                                    className="flex flex-col items-start p-4 border border-slate-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50/50 transition-all text-left group"
                                                >
                                                    <p className="font-bold text-slate-800 group-hover:text-blue-600 whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                                        {inst.name}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inst.code}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Create Admin Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white"
                        >
                            <form onSubmit={handleCreateUser} className="p-10 space-y-6">
                                <header className="flex items-center justify-between mb-2">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register New Admin</h2>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400"
                                    >
                                        <X size={24} />
                                    </button>
                                </header>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                                        <input
                                            required
                                            value={createFormData.firstName}
                                            onChange={e => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                        <input
                                            required
                                            value={createFormData.lastName}
                                            onChange={e => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={createFormData.email}
                                        onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Primary Institute</label>
                                    <select
                                        required
                                        value={createFormData.instituteId}
                                        onChange={e => setCreateFormData({ ...createFormData, instituteId: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select an institute...</option>
                                        {institutes.map(inst => (
                                            <option key={inst._id} value={inst._id}>
                                                {inst.name} ({inst.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={createFormData.password}
                                        onChange={e => setCreateFormData({ ...createFormData, password: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                        placeholder="••••••••"
                                        minLength={8}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Register Now
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
