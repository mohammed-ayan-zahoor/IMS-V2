"use client";

import { useState, useEffect, useRef } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    UserPlus,
    Mail,
    Phone,
    Fingerprint,
    Users
} from "lucide-react";
import { format } from "date-fns";

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        profile: {
            firstName: "",
            lastName: "",
            phone: "",
        }
    });

    // Use a ref to track if it's the first render
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            fetchStudents();
            return;
        }

        const timer = setTimeout(() => {
            fetchStudents();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchStudents = async () => {
        // Cancellation logic
        if (window.fetchController) {
            window.fetchController.abort();
        }
        window.fetchController = new AbortController();

        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students?search=${encodeURIComponent(search)}`, {
                signal: window.fetchController.signal
            });
            const data = await res.json();
            setStudents(data.students || []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Failed to fetch students", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/v1/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsAddModalOpen(false);
                setFormData({ email: "", password: "", profile: { firstName: "", lastName: "", phone: "" } });
                fetchStudents();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to create student");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Student Management</h1>
                    <p className="text-foreground/50 mt-1 uppercase text-xs font-black tracking-widest">Enroll, Monitor and Assist students</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                    <UserPlus size={18} />
                    <span>New Admission</span>
                </Button>
            </div>

            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex-1 max-w-md relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 transition-colors group-focus-within:text-premium-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email or enrollment ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-premium-blue/50 focus:ring-4 focus:ring-premium-blue/10 transition-all text-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                        <Filter size={16} />
                        <span>Filters</span>
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <LoadingSpinner />
                    ) : students.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-y border-glass-border">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Student</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Enrollment ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Contact</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-glass-border">
                                    {students.map((student) => (
                                        <tr key={student._id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-premium-blue to-premium-purple flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                                        {student.profile?.firstName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold capitalize">{student.fullName}</p>
                                                        <p className="text-xs text-foreground/40 break-all">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="primary" className="font-mono">{student.enrollmentNumber || "PENDING"}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-medium">{student.profile?.phone || "No phone"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={student.isActive ? "success" : "danger"}>
                                                    {student.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-white/5 rounded-lg text-foreground/40 hover:text-foreground transition-all">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Users}
                            title="No students found"
                            description="Start by adding your first student to the system."
                            actionLabel="Add Student"
                            onAction={() => setIsAddModalOpen(true)}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add Student Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Student Registration"
            >
                <form onSubmit={handleAddStudent} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="firstName"
                            label="First Name"
                            placeholder="e.g. John"
                            value={formData.profile.firstName}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, firstName: e.target.value } })}
                            required
                        />
                        <Input
                            id="lastName"
                            label="Last Name"
                            placeholder="e.g. Doe"
                            value={formData.profile.lastName}
                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, lastName: e.target.value } })}
                            required
                        />
                    </div>

                    <Input
                        id="email"
                        label="Email Address"
                        type="email"
                        placeholder="student@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    <Input
                        id="phone"
                        label="Phone Number"
                        placeholder="+91 00000 00000"
                        value={formData.profile.phone}
                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                    />

                    <Input
                        id="password"
                        label="Temporary Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">Register Student</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
