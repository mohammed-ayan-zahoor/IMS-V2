"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const PLACEHOLDER_KEYS = {
    front: ["studentName", "studentPhoto", "studentId", "batch", "rollNumber", "dateOfAdmission"],
    back: ["instituteName", "validity", "qrCode", "disclaimer"]
};

const PLACEHOLDER_META = {
    studentName: { label: "Student Name", color: "#f59e0b" },
    studentPhoto: { label: "Student Photo", color: "#3b82f6" },
    studentId: { label: "Student ID", color: "#10b981" },
    batch: { label: "Batch/Course", color: "#8b5cf6" },
    rollNumber: { label: "Roll Number", color: "#ec4899" },
    dateOfAdmission: { label: "Admission Date", color: "#f97316" },
    instituteName: { label: "Institute Name", color: "#6366f1" },
    validity: { label: "Validity", color: "#14b8a6" },
    qrCode: { label: "QR Code", color: "#f43f5e" },
    disclaimer: { label: "Disclaimer", color: "#64748b" }
};

export default function TemplatesTab() {
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeSide, setActiveSide] = useState("front");
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [zoom, setZoom] = useState(100);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: "",
        frontImageUrl: "",
        backImageUrl: "",
        frontPlaceholders: {},
        backPlaceholders: {}
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/id-card-templates");
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e, side) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setForm(prev => ({
                    ...prev,
                    [side === "front" ? "frontImageUrl" : "backImageUrl"]: data.url
                }));
                toast.success(`${side.charAt(0).toUpperCase() + side.slice(1)} image uploaded`);
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveTemplate = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error("Template name is required");
            return;
        }

        if (!form.frontImageUrl || !form.backImageUrl) {
            toast.error("Both front and back images are required");
            return;
        }

        try {
            // Initialize placeholders with defaults if not set
            const payload = {
                name: form.name,
                frontImageUrl: form.frontImageUrl,
                backImageUrl: form.backImageUrl,
                frontPlaceholders: form.frontPlaceholders || getDefaultPlaceholders("front"),
                backPlaceholders: form.backPlaceholders || getDefaultPlaceholders("back")
            };

            const url = editingId
                ? `/api/v1/id-card-templates/${editingId}`
                : "/api/v1/id-card-templates";

            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(editingId ? "Template updated" : "Template created");
                resetForm();
                setShowEditor(false);
                await fetchTemplates();
            } else {
                toast.error(data.error || "Failed to save template");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save template");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Delete this template?")) return;

        try {
            const res = await fetch(`/api/v1/id-card-templates/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Template deleted");
                await fetchTemplates();
            } else {
                toast.error("Failed to delete template");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete template");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedPlaceholder(null);
        setZoom(100);
        setActiveSide("front");
        setForm({
            name: "",
            frontImageUrl: "",
            backImageUrl: "",
            frontPlaceholders: {},
            backPlaceholders: {}
        });
    };

    const handleEditTemplate = (template) => {
        setEditingId(template._id);
        setForm({
            name: template.name,
            frontImageUrl: template.frontImageUrl,
            backImageUrl: template.backImageUrl,
            frontPlaceholders: template.frontPlaceholders || {},
            backPlaceholders: template.backPlaceholders || {}
        });
        setShowEditor(true);
        setActiveSide("front");
    };

    const getDefaultPlaceholders = (side) => {
        const placeholders = {};
        const keys = side === "front" ? PLACEHOLDER_KEYS.front : PLACEHOLDER_KEYS.back;
        
        keys.forEach(key => {
            placeholders[key] = {
                x: 50,
                y: 50 + keys.indexOf(key) * 10,
                fontSize: 14,
                fontFamily: "Arial",
                fontWeight: "normal",
                color: "#000000",
                textAlign: "center",
                enabled: true,
                width: 25,
                height: 30,
                size: 20
            };
        });
        
        return placeholders;
    };

    // List View
    if (!showEditor) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">ID Card Templates</h1>
                        <p className="text-slate-600 mt-1">Manage ID card designs with draggable placeholders</p>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowEditor(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        New Template
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading templates...</div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No templates yet</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {templates.map((template) => (
                            <Card key={template._id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{template.name}</h3>
                                        <p className="text-sm text-slate-600">Created {new Date(template.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditTemplate(template)}
                                        >
                                            <Edit2 size={16} />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteTemplate(template._id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Editor View
    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">{editingId ? "Edit" : "Create"} Template</h2>

            <form onSubmit={handleSaveTemplate} className="space-y-6">
                {/* Template Name */}
                <div>
                    <label className="text-sm font-semibold text-slate-700">Template Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Student ID Card 2024"
                        className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Side Selector */}
                <div className="border-b border-slate-200">
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveSide("front")}
                            className={cn(
                                "px-4 py-2 font-semibold border-b-2 transition-colors",
                                activeSide === "front"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-600 hover:text-slate-900"
                            )}
                        >
                            Front Side
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSide("back")}
                            className={cn(
                                "px-4 py-2 font-semibold border-b-2 transition-colors",
                                activeSide === "back"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-slate-600 hover:text-slate-900"
                            )}
                        >
                            Back Side
                        </button>
                    </div>

                    {/* Image Upload */}
                    <div className="mb-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, activeSide)}
                            style={{ display: "none" }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="w-full"
                        >
                            <Upload size={20} />
                            {uploadingImage ? "Uploading..." : `Upload ${activeSide.charAt(0).toUpperCase() + activeSide.slice(1)} Image`}
                        </Button>
                    </div>
                </div>

                {/* Preview */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h3 className="font-bold text-slate-900 mb-3">Preview</h3>
                    {activeSide === "front" && form.frontImageUrl && (
                        <img src={form.frontImageUrl} alt="Front" className="max-h-48 mx-auto rounded" />
                    )}
                    {activeSide === "back" && form.backImageUrl && (
                        <img src={form.backImageUrl} alt="Back" className="max-h-48 mx-auto rounded" />
                    )}
                    {((activeSide === "front" && !form.frontImageUrl) || (activeSide === "back" && !form.backImageUrl)) && (
                        <p className="text-slate-500 text-center">Upload image to preview</p>
                    )}
                </div>

                {/* Placeholders List */}
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Placeholders</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {(activeSide === "front" ? PLACEHOLDER_KEYS.front : PLACEHOLDER_KEYS.back).map(key => (
                            <div key={key} className="p-3 border border-slate-200 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={true}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-semibold">{PLACEHOLDER_META[key].label}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            resetForm();
                            setShowEditor(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {editingId ? "Update Template" : "Create Template"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
