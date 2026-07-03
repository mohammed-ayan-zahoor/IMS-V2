"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Award, 
    Plus, 
    Calendar, 
    Clock, 
    Camera, 
    AlertCircle, 
    CheckCircle2, 
    Trash2, 
    Image as ImageIcon 
} from "lucide-react";
import { format } from "date-fns";

import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";

export default function StudentTimelinePage() {
    const { data: session } = useSession();
    const toast = useToast();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState(initialFormState());

    function initialFormState() {
        return {
            title: "",
            description: "",
            photoUrl: "",
            date: format(new Date(), "yyyy-MM-dd")
        };
    }

    const fetchTimeline = async () => {
        if (!session?.user?.id) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/students/${session.user.id}/timeline`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            } else {
                toast.error("Failed to load timeline");
            }
        } catch (error) {
            console.error("Error fetching timeline:", error);
            toast.error("Failed to load timeline");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [session?.user?.id]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            const data = new FormData();
            data.append("file", file);
            data.append("fileType", "image");

            const res = await fetch("/api/v1/upload", {
                method: "POST",
                body: data
            });

            if (res.ok) {
                const result = await res.json();
                setFormData(prev => ({ ...prev, photoUrl: result.url }));
                toast.success("Image uploaded successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to upload image");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Image upload failed");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.description) {
            toast.error("Title and Description are required");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch(`/api/v1/students/${session.user.id}/timeline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Achievement submitted successfully! Pending approval.");
                setIsModalOpen(false);
                fetchTimeline();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to submit achievement");
            }
        } catch (error) {
            console.error("Error submitting achievement:", error);
            toast.error("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePending = async (id) => {
        if (!window.confirm("Delete this pending achievement?")) return;
        try {
            const res = await fetch(`/api/v1/students/${session.user.id}/timeline/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Pending achievement deleted");
                fetchTimeline();
            } else {
                toast.error("Failed to delete record");
            }
        } catch (error) {
            console.error("Error deleting pending item:", error);
            toast.error("Failed to delete record");
        }
    };

    const getCategoryStyles = (category, status) => {
        if (status === "pending") {
            return {
                bg: "bg-amber-50 border-amber-100",
                badge: "warning",
                iconColor: "text-amber-600",
                borderColor: "border-amber-200"
            };
        }
        switch (category) {
            case "achievement":
                return {
                    bg: "bg-emerald-50 border-emerald-100",
                    badge: "success",
                    iconColor: "text-emerald-600",
                    borderColor: "border-emerald-200"
                };
            case "disciplinary":
                return {
                    bg: "bg-rose-50 border-rose-100",
                    badge: "danger",
                    iconColor: "text-rose-600",
                    borderColor: "border-rose-200"
                };
            case "milestone":
                return {
                    bg: "bg-blue-50 border-blue-100",
                    badge: "info",
                    iconColor: "text-blue-600",
                    borderColor: "border-blue-200"
                };
            default:
                return {
                    bg: "bg-slate-50 border-slate-100",
                    badge: "secondary",
                    iconColor: "text-slate-600",
                    borderColor: "border-slate-200"
                };
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 h-full overflow-y-auto pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Timeline</h1>
                    <p className="text-sm text-slate-500 font-medium">View your achievements, milestones, and submit your personal awards for approval.</p>
                </div>
                <Button onClick={() => { setFormData(initialFormState()); setIsModalOpen(true); }} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Log Achievement</span>
                </Button>
            </div>

            {loading ? (
                <div className="p-12"><LoadingSpinner /></div>
            ) : events.length === 0 ? (
                <EmptyState
                    icon={Award}
                    title="Timeline is Empty"
                    description="No achievements or milestones logged yet. Share your first achievement today!"
                    actionLabel="Log Achievement"
                    onAction={() => setIsModalOpen(true)}
                />
            ) : (
                <div className="relative border-l border-slate-200 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8 py-4">
                    {events.map((event) => {
                        const styles = getCategoryStyles(event.category, event.status);
                        return (
                            <div key={event._id} className="relative group">
                                {/* Bullet indicator on the line */}
                                <div className={`absolute -left-[33px] md:-left-[41px] top-1.5 w-5 h-5 rounded-full border-4 bg-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm ${styles.borderColor}`} />

                                <Card className={`border shadow-sm hover:shadow-md transition-all overflow-hidden ${styles.bg}`}>
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {format(new Date(event.date), "dd MMM yyyy")}
                                                    </span>
                                                    <Badge variant={styles.badge} className="capitalize">
                                                        {event.status === "pending" ? "Pending Approval" : event.category}
                                                    </Badge>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
                                            </div>

                                            {event.status === "pending" && (
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    className="text-red-600 border-red-100 hover:bg-red-50"
                                                    onClick={() => handleDeletePending(event._id)}
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>

                                        {event.photoUrl && (
                                            <div className="relative max-w-md overflow-hidden rounded-xl border border-slate-100/50 bg-white p-1">
                                                <img 
                                                    src={event.photoUrl} 
                                                    alt={event.title} 
                                                    className="max-h-60 w-full object-cover rounded-lg"
                                                    crossOrigin="anonymous"
                                                />
                                            </div>
                                        )}

                                        {event.status === "approved" && (
                                            <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100/50">
                                                Logged by {event.createdBy?.fullName || "System"}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Share Achievement"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Title *</label>
                        <Input
                            placeholder="E.g. 1st Place at Inter-School Science Olympiad"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date Achieved</label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description *</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Describe your achievement, prize, or special recognition..."
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Attachment / Photo</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                                <Camera size={16} className="text-slate-500" />
                                <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className="hidden"
                                />
                            </label>

                            {formData.photoUrl && (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                                    <ImageIcon size={14} />
                                    <span>Image Attached!</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || uploadingImage}>
                            {submitting ? "Submitting..." : "Submit Achievement"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
