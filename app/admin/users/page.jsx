"use client";

import { useState, useEffect, useMemo } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { User, Shield, UserCog, Mail, Phone, Plus, Search, Trash2, Lock } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import Select from "@/components/ui/Select";

export default function UserManagementPage() {
    const toast = useToast();
    const confirm = useConfirm();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("students"); // 'students' or 'admins'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Password Change State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        role: "student"
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/users");

            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let errorMessage = "Failed to fetch users";
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } else {
                    errorMessage = await res.text();
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error(error.message || "Failed to load users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/v1/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsCreateModalOpen(false);
                setFormData({
                    firstName: "", lastName: "", email: "", phone: "",
                    password: "", role: "student"
                });
                fetchUsers();
                toast.success("User created successfully");
            } else {
                const contentType = res.headers.get("content-type");
                let errorMessage = "Failed to create user";
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } else {
                    errorMessage = await res.text();
                }
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error(error);
            toast.error("Network error during creation");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (await confirm({
            title: "Delete User?",
            message: "This will soft-delete the user and remove their access. Are you sure?",
            type: "danger"
        })) {
            try {
                const res = await fetch(`/api/v1/users/${userId}`, { method: "DELETE" });
                if (res.ok) {
                    toast.success("User deactivated successfully");
                    fetchUsers();
                } else {
                    const contentType = res.headers.get("content-type");
                    let errorMessage = "Failed to delete user";
                    if (contentType && contentType.includes("application/json")) {
                        const errorData = await res.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        errorMessage = await res.text();
                    }
                    toast.error(errorMessage);
                }
            } catch (error) {
                console.error(error);
                toast.error("An error occurred");
            }
        }
    };
    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setNewPassword("");
        setIsPasswordModalOpen(true);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const res = await fetch(`/api/v1/users/${selectedUser._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword })
            });

            if (res.ok) {
                toast.success("Password updated successfully");
                setIsPasswordModalOpen(false);
                setNewPassword("");
                setSelectedUser(null);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update password");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    const filteredUsers = useMemo(() => users.filter(u => {
        const matchesSearch = u.profile?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
            u.profile?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.role?.toLowerCase().includes(search.toLowerCase());

        const isStudent = u.role === 'student';
        const matchesTab = activeTab === 'students' ? isStudent : !isStudent;

        return matchesSearch && matchesTab;
    }), [users, search, activeTab]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Manage admins, instructors, and students.</p>
                </div>
                <div>
                    <Button onClick={() => {
                        setFormData(prev => ({ ...prev, role: activeTab === 'students' ? 'student' : 'admin' }));
                        setIsCreateModalOpen(true);
                    }}>
                        <Plus size={18} className="mr-2" /> Add {activeTab === 'students' ? 'Student' : 'User'}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("students")}
                    className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === "students"
                        ? "text-premium-blue"
                        : "text-slate-500 hover:text-slate-700"}`}
                >
                    Students
                    {activeTab === "students" && (
                        <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-premium-blue rounded-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("admins")}
                    className={`pb-3 px-1 text-sm font-bold transition-all relative ${activeTab === "admins"
                        ? "text-premium-blue"
                        : "text-slate-500 hover:text-slate-700"}`}
                >
                    Admins & Staff
                    {activeTab === "admins" && (
                        <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-premium-blue rounded-full"></span>
                    )}
                </button>
            </div>

            <Card className="border-transparent shadow-sm">
                <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <div className="relative group max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-premium-blue transition-colors" size={18} />
                        <label htmlFor="user-search" className="sr-only">Search users</label>
                        <input
                            id="user-search"
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-premium-blue/30 focus:ring-4 focus:ring-premium-blue/5 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {loading ? <LoadingSpinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                    {user.profile?.firstName?.[0] || "U"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{user.profile?.firstName} {user.profile?.lastName}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{user.enrollmentNumber || user._id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> {user.email}</span>
                                                {user.profile?.phone && <span className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {user.profile.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Actions */}
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openPasswordModal(user)}
                                                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm px-4 font-medium"
                                                >
                                                    <Lock size={14} className="mr-2 text-slate-400" /> Password
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={user.role === 'super_admin'}
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm px-4 font-medium"
                                                >
                                                    <Trash2 size={14} className="mr-2" /> Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal title="Create New User" isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="First Name" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                        <Input label="Last Name" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                    </div>
                    <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />

                    <div className="space-y-1">
                        <Select
                            label="Role"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            options={[
                                { label: "Student", value: "student" },
                                { label: "Admin", value: "admin" },
                                { label: "Instructor", value: "instructor" }
                            ]}
                        />
                    </div>

                    <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Create User</Button>
                    </div>
                </form>
            </Modal>

            {/* Change Password Modal */}
            <Modal title="Change Password" isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4">
                        Changing password for <strong>{selectedUser?.profile?.firstName || 'User'} {selectedUser?.profile?.lastName || ''}</strong> ({selectedUser?.email || 'unknown'})
                    </div>

                    <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="Enter new password"
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Update Password</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function RoleBadge({ role }) {
    if (role === 'admin' || role === 'super_admin') return <Badge variant="primary" className="bg-purple-100 text-purple-700 border-purple-200"><Shield size={10} className="mr-1" /> Admin</Badge>;
    if (role === 'instructor') return <Badge variant="warning" className="bg-orange-100 text-orange-700 border-orange-200"><UserCog size={10} className="mr-1" /> Instructor</Badge>;
    return <Badge variant="neutral" className="bg-slate-100 text-slate-600 border-slate-200"><User size={10} className="mr-1" /> Student</Badge>;
}
