"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useAcademicSession } from "@/contexts/AcademicSessionContext";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
    Hotel,
    Layers,
    Users,
    CreditCard,
    Plus,
    Building2,
    CheckCircle,
    UserCheck,
    Search,
    IndianRupee,
    Calendar,
    Phone,
    MapPin,
    AlertCircle,
    Trash2,
    ShieldAlert,
    ExternalLink,
    Loader2
} from "lucide-react";

export default function HostelManagementPage() {
    const { data: session } = useSession();
    const { selectedSessionId, sessions } = useAcademicSession();
    const toast = useToast();

    // Tabs state
    const [activeTab, setActiveTab] = useState("overview");

    // Live data states
    const [stats, setStats] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [allotments, setAllotments] = useState([]);
    const [students, setStudents] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [selectedBlockFilter, setSelectedBlockFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [activeModal, setActiveModal] = useState(null); // 'block', 'room', 'allot', 'payment', 'vacate'
    const [selectedItem, setSelectedItem] = useState(null);

    // Form inputs states
    const [blockForm, setBlockForm] = useState({ name: "", type: "mixed", floors: "1", warden: "", wardenPhone: "", amenities: "" });
    const [roomForm, setRoomForm] = useState({ block: "", roomNumber: "", floor: "0", type: "double", capacity: "2", monthlyRent: "", amenities: "" });
    const [allotForm, setAllotForm] = useState({ student: "", block: "", room: "", billingCycle: "monthly", feePerCycle: "", notes: "", allotmentDate: new Date().toISOString().split('T')[0] });
    const [payForm, setPayForm] = useState({ installmentId: "", amount: "", method: "cash", transactionId: "", collectedBy: "", notes: "", date: new Date().toISOString().split('T')[0] });

    // Lock body scroll when any modal is open
    useEffect(() => {
        if (activeModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [activeModal]);

    // Refresh everything
    const refreshData = async () => {
        setLoading(true);
        await Promise.all([
            fetchStats(),
            fetchBlocks(),
            fetchRooms(),
            fetchAllotments()
        ]);
        setLoading(false);
    };

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/hostel/stats?session=${selectedSessionId}`);
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (err) {
            console.error(err);
        }
    }, [selectedSessionId]);

    const fetchBlocks = useCallback(async () => {
        try {
            const res = await fetch("/api/v1/hostel/blocks");
            const data = await res.json();
            if (res.ok) setBlocks(data.blocks || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchRooms = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/hostel/rooms?sessionId=${selectedSessionId}`);
            const data = await res.json();
            if (res.ok) setRooms(data.rooms || []);
        } catch (err) {
            console.error(err);
        }
    }, [selectedSessionId]);

    const fetchAllotments = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/hostel/allotments?session=${selectedSessionId}`);
            const data = await res.json();
            if (res.ok) setAllotments(data.allotments || []);
        } catch (err) {
            console.error(err);
        }
    }, [selectedSessionId]);

    const fetchStudents = useCallback(async () => {
        try {
            // Retrieve students matching active session
            const res = await fetch("/api/v1/students?limit=200");
            const data = await res.json();
            if (res.ok) setStudents(data.students || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchAvailableRooms = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/hostel/rooms/available?sessionId=${selectedSessionId}`);
            const data = await res.json();
            if (res.ok) setAvailableRooms(data.blocks || []);
        } catch (err) {
            console.error(err);
        }
    }, [selectedSessionId]);

    // Trigger initial data load when session changes
    useEffect(() => {
        if (selectedSessionId) {
            fetchStats();
            fetchBlocks();
            fetchRooms();
            fetchAllotments();
            fetchStudents();
        }
    }, [selectedSessionId, fetchStats, fetchBlocks, fetchRooms, fetchAllotments, fetchStudents]);

    // Form handlers
    const handleCreateBlock = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/hostel/blocks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...blockForm,
                    amenities: blockForm.amenities.split(",").map(a => a.trim()).filter(Boolean)
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Hostel Block created successfully!");
                setActiveModal(null);
                setBlockForm({ name: "", type: "mixed", floors: "1", warden: "", wardenPhone: "", amenities: "" });
                refreshData();
            } else {
                toast.error(data.error || "Failed to create block");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/hostel/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...roomForm,
                    amenities: roomForm.amenities.split(",").map(a => a.trim()).filter(Boolean)
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Hostel Room created successfully!");
                setActiveModal(null);
                setRoomForm({ block: "", roomNumber: "", floor: "0", type: "double", capacity: "2", monthlyRent: "", amenities: "" });
                refreshData();
            } else {
                toast.error(data.error || "Failed to create room");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateAllotment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/hostel/allotments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...allotForm,
                    session: selectedSessionId
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Room allotted successfully!");
                setActiveModal(null);
                setAllotForm({ student: "", block: "", room: "", billingCycle: "monthly", feePerCycle: "", notes: "", allotmentDate: new Date().toISOString().split('T')[0] });
                refreshData();
            } else {
                toast.error(data.error || "Failed to allot room");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/hostel/allotments/${selectedItem._id}/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...payForm,
                    collectedBy: session?.user?.name
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Payment recorded successfully!");
                setActiveModal(null);
                setPayForm({ installmentId: "", amount: "", method: "cash", transactionId: "", collectedBy: "", notes: "", date: new Date().toISOString().split('T')[0] });
                refreshData();
            } else {
                toast.error(data.error || "Failed to record payment");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleVacateRoom = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/hostel/allotments/${selectedItem._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "vacated"
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Room vacated successfully!");
                setActiveModal(null);
                refreshData();
            } else {
                toast.error(data.error || "Failed to vacate room");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const openAllotModal = () => {
        fetchAvailableRooms();
        setActiveModal('allot');
    };

    // Filter calculations
    const filteredRooms = rooms.filter(room => {
        const matchesBlock = !selectedBlockFilter || room.block?._id === selectedBlockFilter;
        const matchesSearch = !searchQuery || room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesBlock && matchesSearch;
    });

    const filteredAllotments = allotments.filter(allot => {
        const studentName = `${allot.student?.profile?.firstName || ''} ${allot.student?.profile?.lastName || ''}`.toLowerCase();
        const enrollment = (allot.student?.enrollmentNumber || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        return studentName.includes(search) || enrollment.includes(search);
    });

    const activeSessionName = sessions?.find(s => s._id === selectedSessionId)?.sessionName || null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* Header Dashboard Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 sm:p-8 shadow-xl border border-indigo-950/50">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                            <Hotel size={14} className="animate-pulse" />
                            Residential services
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Hostel Management</h1>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-xl">
                            Configure blocks, allocate dynamic rooms, automate installment cycles, and process residential dues efficiently.
                        </p>
                        {/* Session indicator */}
                        {activeSessionName ? (
                            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30">
                                <Calendar size={11} className="text-indigo-300" />
                                <span className="text-[11px] font-bold text-indigo-200 tracking-wide">Session: {activeSessionName}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30">
                                <AlertCircle size={11} className="text-amber-300" />
                                <span className="text-[11px] font-bold text-amber-200 tracking-wide">No session selected — select one from the header</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="secondary" 
                            className="bg-white/10 text-white hover:bg-white/20 border-white/10"
                            onClick={refreshData}
                        >
                            Refresh View
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/35 border-0"
                            onClick={openAllotModal}
                        >
                            <Plus size={16} className="mr-1.5" /> Allot Room
                        </Button>
                    </div>
                </div>

                {/* Sub Tab Navigation inside banner */}
                <div className="flex items-center gap-1 mt-6 sm:mt-8 border-b border-white/10 overflow-x-auto scrollbar-none pb-0.5">
                    {[
                        { id: "overview", label: "Overview", icon: Layers },
                        { id: "blocks", label: "Blocks", icon: Building2 },
                        { id: "rooms", label: "Rooms", icon: Hotel },
                        { id: "allotments", label: "Allotments", icon: UserCheck },
                        { id: "ledger", label: "Fee Ledger", icon: CreditCard }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-all shrink-0 border-b-2 -mb-0.5",
                                activeTab === tab.id 
                                    ? "text-indigo-400 border-indigo-400 bg-white/[0.04]" 
                                    : "text-slate-400 border-transparent hover:text-white hover:bg-white/[0.02]"
                            )}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* No-session guard */}
            {!selectedSessionId && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                        <Calendar size={24} className="text-amber-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">No Academic Session Selected</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">
                        Hostel allotments, occupancy, and financial data are session-scoped. Please select a session from the top bar.
                    </p>
                </div>
            )}

            {/* TAB CONTENT: Overview */}
            {selectedSessionId && activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Aggregated Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Blocks", value: stats?.totalBlocks || 0, icon: Building2, color: "from-blue-500/10 to-indigo-500/10 text-indigo-600" },
                            { label: "Total Rooms", value: stats?.totalRooms || 0, icon: Hotel, color: "from-indigo-500/10 to-purple-500/10 text-purple-600" },
                            { label: "Occupied Beds", value: stats?.occupiedBeds || 0, sub: `${stats?.availableBeds || 0} available · ${activeSessionName || 'this session'}`, icon: Users, color: "from-emerald-500/10 to-teal-500/10 text-emerald-600" },
                            { label: "Total Capacity", value: stats?.totalCapacity || 0, sub: "Beds configured", icon: CheckCircle, color: "from-amber-500/10 to-orange-500/10 text-amber-600" }
                        ].map((stat, idx) => (
                            <Card key={idx} className="relative overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">{stat.value}</h3>
                                        {stat.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-bold">{stat.sub}</p>}
                                    </div>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", stat.color)}>
                                        <stat.icon size={18} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Finance Ledger aggregated stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: "Gross Expected Revenue", amount: stats?.totalGross || 0, color: "border-slate-100 bg-slate-50/50 text-slate-700" },
                            { label: "Collected Revenue", amount: stats?.totalCollected || 0, color: "border-emerald-100 bg-emerald-50/30 text-emerald-700" },
                            { label: "Outstanding Dues", amount: stats?.totalPending || 0, color: "border-rose-100 bg-rose-50/30 text-rose-700" }
                        ].map((fin, idx) => (
                            <div key={idx} className={cn("p-5 rounded-2xl border flex items-center justify-between shadow-sm", fin.color)}>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider opacity-85">{fin.label}</p>
                                    <h3 className="text-2xl font-black tracking-tight mt-1">₹{fin.amount.toLocaleString()}</h3>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <IndianRupee size={16} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Overview Allotment lists */}
                    <Card title="Recently Assigned Residents" description="Latest room allocations in this session.">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="py-3 text-xs font-black uppercase tracking-wider text-slate-400">Student</th>
                                        <th className="py-3 text-xs font-black uppercase tracking-wider text-slate-400">Location</th>
                                        <th className="py-3 text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Date</th>
                                        <th className="py-3 text-xs font-black uppercase tracking-wider text-slate-400">Financial status</th>
                                        <th className="py-3 text-xs font-black uppercase tracking-wider text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allotments.slice(0, 5).map(allot => (
                                        <tr key={allot._id} className="hover:bg-slate-50/40 transition-colors">
                                            <td className="py-3.5">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                                                        {allot.student?.profile?.firstName} {allot.student?.profile?.lastName}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{allot.student?.enrollmentNumber}</p>
                                                </div>
                                            </td>
                                            <td className="py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100">
                                                        {allot.block?.name}
                                                    </Badge>
                                                    <span className="text-xs font-medium text-slate-500 font-mono">
                                                        Room {allot.room?.roomNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 text-xs text-slate-500 font-mono">
                                                {new Date(allot.allotmentDate).toLocaleDateString()}
                                            </td>
                                            <td className="py-3.5">
                                                <Badge className={cn(
                                                    "capitalize",
                                                    allot.feeStatus === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    allot.feeStatus === "overdue" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                    "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {allot.feeStatus?.replace("_", " ")}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 text-right">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setActiveTab("ledger");
                                                        setSearchQuery(allot.student?.profile?.firstName || "");
                                                    }}
                                                >
                                                    Ledger
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allotments.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-10 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <UserCheck size={28} className="text-slate-200" />
                                                    <p className="text-xs font-bold text-slate-400">No allotments in <span className="text-indigo-400">{activeSessionName || 'this session'}</span></p>
                                                    <p className="text-[10px] text-slate-300">Use "Allot Room" to assign the first resident.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: Blocks */}
            {selectedSessionId && activeTab === "blocks" && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Hostel Blocks</h3>
                            <p className="text-xs text-slate-400 font-medium">Physical buildings with defined floor layouts and wardens.</p>
                        </div>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => setActiveModal('block')}
                        >
                            <Plus size={16} className="mr-1" /> Add Block
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {blocks.map(block => (
                            <Card 
                                key={block._id}
                                title={block.name}
                                subtitle={`${block.floors} Floorsconfigured`}
                            >
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Badge className="bg-slate-100 text-slate-600 capitalize">
                                            {block.type} Block
                                        </Badge>
                                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100">
                                            {block.totalRooms || 0} Rooms
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                                        <div className="flex justify-between items-center text-slate-500 font-medium">
                                            <span>Warden Name</span>
                                            <span className="font-bold text-slate-700">{block.warden?.profile?.firstName ? `${block.warden.profile.firstName} ${block.warden.profile.lastName}` : block.wardenName || block.wardenPhone || "Not Assigned"}</span>
                                        </div>
                                    </div>

                                    {block.amenities && block.amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-2">
                                            {block.amenities.map((amenity, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide bg-slate-100 text-slate-500">
                                                    {amenity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Rooms */}
            {selectedSessionId && activeTab === "rooms" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Rooms & Capacity</h3>
                            <p className="text-xs text-slate-400 font-medium font-mono">List of physical rooms and real-time vacancies.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                                value={selectedBlockFilter}
                                onChange={e => setSelectedBlockFilter(e.target.value)}
                            >
                                <option value="">All Blocks</option>
                                {blocks.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                            <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => setActiveModal('room')}
                            >
                                <Plus size={16} className="mr-1" /> Add Room
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {filteredRooms.map(room => (
                            <Card key={room._id} className="relative group overflow-hidden border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all duration-200">
                                <div className="absolute top-3 right-3">
                                    <Badge className={cn(
                                        room.isAvailable ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                    )}>
                                        {room.isAvailable ? `${room.capacity - room.currentOccupancy} Left` : "Full"}
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider font-mono">{room.block?.name || 'Unknown Block'}</p>
                                        <h4 className="text-lg font-black text-slate-800 mt-0.5">Room {room.roomNumber}</h4>
                                        <p className="text-[11px] text-slate-400 capitalize font-medium">{room.type} type room • Floor {room.floor}</p>
                                    </div>

                                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Monthly Rent</span>
                                        <span className="text-sm font-black text-slate-700">₹{room.monthlyRent?.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px] font-medium text-slate-500">
                                        <span>Occupied <span className="text-[9px] text-slate-400 font-normal">({activeSessionName || 'this session'})</span></span>
                                        <span className="font-bold text-slate-700">{room.currentOccupancy} / {room.capacity}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Allotments */}
            {selectedSessionId && activeTab === "allotments" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Active Room Assignments</h3>
                            <p className="text-xs text-slate-400 font-medium">Record room assignments, trace student locations, and vacate rooms on-demand.</p>
                        </div>
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                                placeholder="Search by student name or enrollment..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="p-4 text-xs font-black uppercase text-slate-400">Student</th>
                                    <th className="p-4 text-xs font-black uppercase text-slate-400">Location Details</th>
                                    <th className="p-4 text-xs font-black uppercase text-slate-400 font-mono">Allotment Date</th>
                                    <th className="p-4 text-xs font-black uppercase text-slate-400">Billing Cycle</th>
                                    <th className="p-4 text-xs font-black uppercase text-slate-400">Status</th>
                                    <th className="p-4 text-xs font-black uppercase text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAllotments.map(allot => (
                                    <tr key={allot._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {allot.student?.profile?.firstName} {allot.student?.profile?.lastName}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{allot.student?.enrollmentNumber || "N/A"}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100">
                                                    {allot.block?.name}
                                                </Badge>
                                                <Badge className="bg-slate-100 text-slate-600">
                                                    Room {allot.room?.roomNumber}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500 font-mono">
                                            {new Date(allot.allotmentDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-xs capitalize text-slate-600 font-bold">
                                            {allot.billingCycle} (₹{allot.feePerCycle?.toLocaleString()})
                                        </td>
                                        <td className="p-4">
                                            <Badge className={cn(
                                                "capitalize font-bold",
                                                allot.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {allot.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {allot.status === "active" && (
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm"
                                                        className="text-rose-600 hover:text-rose-700 bg-rose-50/20 border-rose-100 hover:bg-rose-50/40"
                                                        onClick={() => {
                                                            setSelectedItem(allot);
                                                            setActiveModal('vacate');
                                                        }}
                                                    >
                                                        Vacate
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setActiveTab("ledger");
                                                        setSearchQuery(allot.student?.profile?.firstName || "");
                                                    }}
                                                >
                                                    Dues Ledger
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Ledger & Payment Processing */}
            {selectedSessionId && activeTab === "ledger" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Fee Ledger Report</h3>
                            <p className="text-xs text-slate-400 font-medium">Record student installment collection receipts and trace remaining balances.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 shrink-0">
                                <Calendar size={11} className="text-indigo-500" />
                                <span className="text-[11px] font-bold text-indigo-600">{activeSessionName || 'Session'}</span>
                            </div>
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                                    placeholder="Search by resident student name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredAllotments.map(allot => (
                            <Card key={allot._id} className="border border-slate-100 hover:border-slate-200 transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {allot.student?.profile?.firstName} {allot.student?.profile?.lastName}
                                            </h4>
                                            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-mono text-[9px] uppercase">
                                                🏠 {allot.block?.name} • Room {allot.room?.roomNumber}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {allot.student?.enrollmentNumber || "N/A"}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                                        <div>
                                            <p className="text-[9px] uppercase text-slate-400 font-black">Gross Total</p>
                                            <p className="text-slate-800 mt-0.5">₹{allot.totalAmount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase text-slate-400 font-black">Paid Total</p>
                                            <p className="text-emerald-600 mt-0.5">₹{allot.paidAmount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase text-slate-400 font-black">Remaining Balance</p>
                                            <p className="text-rose-600 mt-0.5">₹{allot.balanceAmount?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Installment breakdown grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                    {(allot.installments || []).map((inst, idx) => (
                                        <div 
                                            key={inst._id || idx}
                                            className={cn(
                                                "p-3 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                                                inst.status === "paid" ? "bg-emerald-50/10 border-emerald-100" :
                                                inst.status === "overdue" ? "bg-rose-50/10 border-rose-100 animate-pulse" :
                                                "bg-slate-50/40 border-slate-100"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{inst.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Due: {new Date(inst.dueDate).toLocaleDateString()}</p>
                                                </div>
                                                <Badge className={cn(
                                                    "capitalize text-[9px] px-1.5 py-0.5 font-black",
                                                    inst.status === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    inst.status === "overdue" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                    "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {inst.status}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-black text-slate-800">₹{inst.amount?.toLocaleString()}</span>
                                                {inst.status !== "paid" && (
                                                    <Button 
                                                        size="sm" 
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        onClick={() => {
                                                            setSelectedItem(allot);
                                                            setPayForm({
                                                                ...payForm,
                                                                installmentId: inst._id,
                                                                amount: inst.amount
                                                            });
                                                            setActiveModal('payment');
                                                        }}
                                                    >
                                                        Collect Fee
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                        {filteredAllotments.length === 0 && (
                            <div className="flex flex-col items-center py-14 gap-2">
                                <CreditCard size={28} className="text-slate-200" />
                                <p className="text-xs font-bold text-slate-400">No fee records for <span className="text-indigo-500">{activeSessionName || 'this session'}</span></p>
                                <p className="text-[10px] text-slate-300">Allot a room first to auto-generate installment cycles.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL WINDOWS */}
            
            {/* Create Block Modal */}
            {activeModal === "block" && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <Card className="w-full max-w-md shadow-2xl border border-slate-100 relative" title="Create New Hostel Block">
                        <form onSubmit={handleCreateBlock} className="space-y-4">
                            <Input
                                label="Block Name / Alias"
                                required
                                placeholder="Boys Block A, Girls Annex..."
                                value={blockForm.name}
                                onChange={e => setBlockForm({ ...blockForm, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500">Gender Classification</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                        value={blockForm.type}
                                        onChange={e => setBlockForm({ ...blockForm, type: e.target.value })}
                                    >
                                        <option value="mixed">Mixed</option>
                                        <option value="boys">Boys</option>
                                        <option value="girls">Girls</option>
                                    </select>
                                </div>
                                <Input
                                    label="Floors Count"
                                    type="number"
                                    min="1"
                                    required
                                    value={blockForm.floors}
                                    onChange={e => setBlockForm({ ...blockForm, floors: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Warden Name (Optional)"
                                placeholder="Enter warden name"
                                value={blockForm.warden}
                                onChange={e => setBlockForm({ ...blockForm, warden: e.target.value })}
                            />
                            <Input
                                label="Warden Phone (Optional)"
                                placeholder="Enter warden contact phone"
                                value={blockForm.wardenPhone}
                                onChange={e => setBlockForm({ ...blockForm, wardenPhone: e.target.value })}
                            />
                            <Input
                                label="Amenities (Comma-separated)"
                                placeholder="WiFi, AC, Laundry, Gym..."
                                value={blockForm.amenities}
                                onChange={e => setBlockForm({ ...blockForm, amenities: e.target.value })}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white">
                                    {submitting ? "Creating..." : "Save Block"}
                                </Button>
                            </div>
                        </form>
                    </Card>
            </div>,
            typeof document !== 'undefined' ? document.body : null
            )}

            {/* Create Room Modal */}
            {activeModal === "room" && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <Card className="w-full max-w-md shadow-2xl border border-slate-100" title="Create New Hostel Room">
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500">Hostel Block</label>
                                <select
                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                    required
                                    value={roomForm.block}
                                    onChange={e => setRoomForm({ ...roomForm, block: e.target.value })}
                                >
                                    <option value="">Select Block</option>
                                    {blocks.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Room Number / Label"
                                    required
                                    placeholder="101, 102A..."
                                    value={roomForm.roomNumber}
                                    onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                                />
                                <Input
                                    label="Floor Number"
                                    type="number"
                                    required
                                    value={roomForm.floor}
                                    onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500">Room Type</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                        value={roomForm.type}
                                        onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}
                                    >
                                        <option value="single">Single Bed</option>
                                        <option value="double">Double Bed</option>
                                        <option value="triple">Triple Bed</option>
                                        <option value="dormitory">Dormitory</option>
                                    </select>
                                </div>
                                <Input
                                    label="Bed Capacity"
                                    type="number"
                                    min="1"
                                    required
                                    value={roomForm.capacity}
                                    onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })}
                                />
                            </div>
                            <Input
                                label="Cycle Billing Rent (₹)"
                                type="number"
                                required
                                placeholder="5000, 8000..."
                                value={roomForm.monthlyRent}
                                onChange={e => setRoomForm({ ...roomForm, monthlyRent: e.target.value })}
                            />
                            <Input
                                label="Amenities (Comma-separated)"
                                placeholder="Balcony, AC, Study desk..."
                                value={roomForm.amenities}
                                onChange={e => setRoomForm({ ...roomForm, amenities: e.target.value })}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white">
                                    {submitting ? "Creating..." : "Save Room"}
                                </Button>
                            </div>
                        </form>
                    </Card>
            </div>,
            typeof document !== 'undefined' ? document.body : null
            )}

            {/* Allot Room Modal */}
            {activeModal === "allot" && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <Card className="w-full max-w-md shadow-2xl border border-slate-100" title="Allocate Hostel Room">
                        <form onSubmit={handleCreateAllotment} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500">Student</label>
                                <select
                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                    required
                                    value={allotForm.student}
                                    onChange={e => setAllotForm({ ...allotForm, student: e.target.value })}
                                >
                                    <option value="">Select Resident Student</option>
                                    {students.map(s => (
                                        <option key={s._id} value={s._id}>{s.profile?.firstName} {s.profile?.lastName} ({s.enrollmentNumber || "No ID"})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500">Available Room Selection</label>
                                <select
                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                    required
                                    value={allotForm.room}
                                    onChange={e => {
                                        const rId = e.target.value;
                                        // Auto detect block and rent
                                        let foundBlock = null;
                                        let foundRoom = null;
                                        availableRooms.forEach(b => {
                                            const r = b.rooms.find(rm => rm._id === rId);
                                            if (r) {
                                                foundBlock = b._id;
                                                foundRoom = r;
                                            }
                                        });

                                        setAllotForm({
                                            ...allotForm,
                                            room: rId,
                                            block: foundBlock || "",
                                            feePerCycle: foundRoom ? foundRoom.monthlyRent : ""
                                        });
                                    }}
                                >
                                    <option value="">Select Available Room</option>
                                    {availableRooms.map(b => (
                                        <optgroup key={b._id} label={b.name}>
                                            {b.rooms.map(r => (
                                                <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.type} - {r.availableBeds} beds left) - ₹{r.monthlyRent}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500">Billing Cycle</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                        required
                                        value={allotForm.billingCycle}
                                        onChange={e => setAllotForm({ ...allotForm, billingCycle: e.target.value })}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                                <Input
                                    label="Cycle Fee (₹)"
                                    type="number"
                                    required
                                    value={allotForm.feePerCycle}
                                    onChange={e => setAllotForm({ ...allotForm, feePerCycle: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Allotment Start Date"
                                type="date"
                                required
                                value={allotForm.allotmentDate}
                                onChange={e => setAllotForm({ ...allotForm, allotmentDate: e.target.value })}
                            />

                            <Input
                                label="Administration Notes"
                                placeholder="E.g. key issued, caution deposit paid"
                                value={allotForm.notes}
                                onChange={e => setAllotForm({ ...allotForm, notes: e.target.value })}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white">
                                    {submitting ? "Processing..." : "Confirm Allotment"}
                                </Button>
                            </div>
                        </form>
                </Card>
            </div>,
            typeof document !== 'undefined' ? document.body : null
            )}

            {/* Record Payment Modal */}
            {activeModal === "payment" && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <Card className="w-full max-w-md shadow-2xl border border-slate-100" title="Process Installment Receipt">
                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                                <p className="text-xs text-slate-500 font-medium">Processing payment for:</p>
                                <h4 className="text-sm font-bold text-slate-700 mt-1">
                                    {selectedItem?.student?.profile?.firstName} {selectedItem?.student?.profile?.lastName}
                                </h4>
                                <p className="text-[10px] text-indigo-600 font-mono mt-0.5 uppercase font-bold">🏠 {selectedItem?.block?.name} • Room {selectedItem?.room?.roomNumber}</p>
                            </div>

                            <Input
                                label="Payment Amount (₹)"
                                type="number"
                                required
                                value={payForm.amount}
                                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500">Method</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                                        required
                                        value={payForm.method}
                                        onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI / QR Scan</option>
                                        <option value="card">Credit/Debit Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                                <Input
                                    label="Payment Date"
                                    type="date"
                                    required
                                    value={payForm.date}
                                    onChange={e => setPayForm({ ...payForm, date: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Transaction / Reference ID"
                                placeholder="E.g. UPI Ref, Bank UTR..."
                                value={payForm.transactionId}
                                onChange={e => setPayForm({ ...payForm, transactionId: e.target.value })}
                            />

                            <Input
                                label="Receipt Memo / Notes"
                                placeholder="Add optional details..."
                                value={payForm.notes}
                                onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-indigo-600 text-white">
                                    {submitting ? "Recording..." : "Approve Receipt"}
                                </Button>
                            </div>
                        </form>
                </Card>
            </div>,
            typeof document !== 'undefined' ? document.body : null
            )}

            {/* Vacate Room Modal */}
            {activeModal === "vacate" && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setActiveModal(null); }}>
                    <Card className="w-full max-w-sm shadow-2xl border border-rose-100" title="Vacate Room Allotment">
                        <form onSubmit={handleVacateRoom} className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
                                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Are you absolutely sure?</p>
                                    <p className="mt-1 opacity-90">This will release the bed in Room {selectedItem?.room?.roomNumber} for student {selectedItem?.student?.profile?.firstName} {selectedItem?.student?.profile?.lastName}. Historical dues and ledger payments will be preserved.</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={submitting} className="bg-rose-600 text-white hover:bg-rose-700">
                                    {submitting ? "Processing..." : "Confirm Vacate"}
                                </Button>
                            </div>
                        </form>
                    </Card>
            </div>,
            typeof document !== 'undefined' ? document.body : null
            )}

        </div>
    );
}
