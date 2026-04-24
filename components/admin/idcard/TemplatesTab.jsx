"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Edit2, Trash2, Upload, Maximize2, Minimize2, X, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, Type, Layout, Palette, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const PLACEHOLDER_KEYS = {
    front: ["studentName", "studentPhoto", "studentId", "batch", "rollNumber", "dateOfAdmission"],
    back: ["instituteName", "validity", "qrCode", "disclaimer"]
};

const PLACEHOLDER_META = {
    studentName: { label: "Student Name", color: "#f59e0b", type: "text", sample: "John Doe" },
    studentPhoto: { label: "Student Photo", color: "#3b82f6", type: "image", sample: "PHOTO" },
    studentId: { label: "Student ID", color: "#10b981", type: "text", sample: "ID: 12345" },
    batch: { label: "Batch/Course", color: "#8b5cf6", type: "text", sample: "Batch 2026" },
    rollNumber: { label: "Roll Number", color: "#ec4899", type: "text", sample: "Roll: 42" },
    dateOfAdmission: { label: "Admission Date", color: "#f97316", type: "text", sample: "Accepted: Sep 2024" },
    instituteName: { label: "Institute Name", color: "#6366f1", type: "text", sample: "Acme Institute" },
    validity: { label: "Validity", color: "#14b8a6", type: "text", sample: "Valid Thru 2028" },
    qrCode: { label: "QR Code", color: "#f43f5e", type: "qr", sample: "QR CODE" },
    disclaimer: { label: "Disclaimer", color: "#64748b", type: "text", sample: "Return to Institute if found" }
};

// ─── Draggable Placeholder on Canvas ────────────────────────────────────────
function DraggablePlaceholder({ id, placeholder, meta, containerRef, onDrag, onSelect, isSelected, zoom }) {
    const elRef = useRef(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        onSelect(id);

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const elRect = elRef.current?.getBoundingClientRect();
        if (!elRect) return;

        offset.current = {
            x: e.clientX - elRect.left - elRect.width / 2,
            y: e.clientY - elRect.top - elRect.height / 2
        };

        const handlePointerMove = (moveEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            const relX = (moveEvent.clientX - containerRect.left - offset.current.x) * (100 / zoom);
            const relY = (moveEvent.clientY - containerRect.top - offset.current.y) * (100 / zoom);

            const pctX = Math.max(0, Math.min(100, (relX / containerRect.width) * 100));
            const pctY = Math.max(0, Math.min(100, (relY / containerRect.height) * 100));

            onDrag(id, pctX, pctY);
        };

        const handlePointerUp = () => {
            isDragging.current = false;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }, [id, containerRef, onDrag, onSelect, zoom]);

    if (!placeholder.enabled) return null;

    if (meta.type === "image" || meta.type === "qr") {
        let width = meta.type === "qr" ? (placeholder.width || placeholder.size || 20) : placeholder.width;
        let height = meta.type === "qr" ? (placeholder.height || placeholder.size || 20) : placeholder.height;
        
        // Enforce aspect ratio visually in editor (320x480 container)
        if (placeholder.shape && placeholder.shape !== 'rectangle') {
            height = width * (320 / 480);
        }

        let bRad = placeholder.borderRadius || 0;
        if (placeholder.shape === 'circle') bRad = 50;
        if (placeholder.shape === 'square') bRad = 0;
        if (placeholder.shape === 'rounded-square') bRad = 15;
        
        let bWid = placeholder.borderWidth || 0;

        return (
            <div
                ref={elRef}
                onPointerDown={handlePointerDown}
                className={cn(
                    "absolute flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none overflow-hidden",
                    !meta.imageUrl ? "bg-slate-200" : "bg-white",
                    isSelected ? "ring-2 ring-blue-500 shadow-xl z-20" : "z-10 shadow-sm hover:opacity-100"
                )}
                style={{
                    left: `${placeholder.x}%`,
                    top: `${placeholder.y}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    transform: "translate(-50%, -50%)",
                    borderRadius: `${bRad}%`,
                    border: bWid > 0 ? `${Math.max(1, bWid)}px solid ${placeholder.borderColor || "#000"}` : "none",
                }}
            >
                {meta.imageUrl ? (
                    <img src={meta.imageUrl} alt={meta.label} className={cn("w-full h-full pointer-events-none", meta.type === "qr" ? "object-contain bg-white" : "object-cover")} />
                ) : (
                    <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider">{meta.sample}</span>
                )}
            </div>
        );
    }

    const fontSize = placeholder.fontSize || 16;
    const fontWeight = placeholder.fontWeight || "normal";
    const fontStyle = placeholder.fontStyle || "normal";
    const color = placeholder.color || "#000000";
    const textAlign = placeholder.textAlign || "center";
    const textTransform = placeholder.textTransform || "none";

    return (
        <div
            ref={elRef}
            onPointerDown={handlePointerDown}
            className={cn(
                "absolute flex items-center justify-center px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none touch-none",
                isSelected ? "ring-2 ring-blue-500 bg-blue-500/10 z-20" : "z-10 hover:bg-slate-200/50"
            )}
            style={{
                left: `${placeholder.x}%`,
                top: `${placeholder.y}%`,
                transform: "translate(-50%, -50%)",
            }}
        >
            <span
                className="whitespace-nowrap leading-none"
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: fontWeight,
                    fontStyle: fontStyle,
                    color: color,
                    textAlign: textAlign,
                    textTransform: textTransform,
                }}
            >
                {meta.sample}
            </span>
        </div>
    );
}

// ─── Style Panel Component ──────────────────────────────────────────────────
function StylePanel({ selectedPlaceholder, placeholder, meta, onChange }) {
    if (!selectedPlaceholder || !placeholder?.enabled) return null;

    return (
        <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b bg-white">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: meta.color }} />
                    <h3 className="font-bold text-slate-900 text-sm">{meta.label}</h3>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Style Settings</p>
            </div>

            <div className="p-5 space-y-8 overflow-y-auto flex-1">
                {meta.type === "text" && (
                    <>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Type size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Typography</h4>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Family</label>
                                <select
                                    value={placeholder.fontFamily || "Arial"}
                                    onChange={(e) => onChange("fontFamily", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-white"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Lora">Lora</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Size</label>
                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.fontSize || 12}px</span>
                                </div>
                                <input
                                    type="range" min="8" max="72"
                                    value={placeholder.fontSize || 12}
                                    onChange={(e) => onChange("fontSize", parseInt(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Font Weight</label>
                                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => onChange("fontWeight", "normal")}
                                        className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-colors", placeholder.fontWeight === "normal" ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}
                                    >Normal</button>
                                    <button
                                        type="button"
                                        onClick={() => onChange("fontWeight", "bold")}
                                        className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-colors", placeholder.fontWeight === "bold" ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}
                                    >Bold</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Layout size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Layout & Format</h4>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alignment</label>
                                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                    {[
                                        { val: "left", icon: AlignLeft },
                                        { val: "center", icon: AlignCenter },
                                        { val: "right", icon: AlignRight }
                                    ].map(({ val, icon: Icon }) => (
                                        <button
                                            key={val} type="button"
                                            onClick={() => onChange("textAlign", val)}
                                            className={cn("flex-1 py-1.5 flex justify-center items-center rounded-md transition-colors", placeholder.textAlign === val ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900")}
                                        ><Icon size={16} /></button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transform</label>
                                <select
                                    value={placeholder.textTransform || "none"}
                                    onChange={(e) => onChange("textTransform", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-white"
                                >
                                    <option value="none">None</option>
                                    <option value="uppercase">UPPERCASE</option>
                                    <option value="lowercase">lowercase</option>
                                    <option value="capitalize">Capitalize Words</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Palette size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Appearance</h4>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Text Color</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-8 h-8 rounded-full shadow-sm border border-slate-200 overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={placeholder.color || "#000000"}
                                            onChange={(e) => onChange("color", e.target.value)}
                                            className="absolute -inset-2 w-12 h-12 cursor-pointer"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={placeholder.color || "#000000"}
                                        onChange={(e) => onChange("color", e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {meta.type === "image" && (
                    <>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Layout size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Dimensions</h4>
                            </div>

                            <div className="space-y-2 mb-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shape Preset</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                                    <button type="button" onClick={() => onChange("shape", "rectangle")} className={cn("py-1.5 text-xs font-medium rounded-md transition-colors", placeholder.shape === "rectangle" || !placeholder.shape ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}>Rectangle</button>
                                    <button type="button" onClick={() => onChange("shape", "square")} className={cn("py-1.5 text-xs font-medium rounded-md transition-colors", placeholder.shape === "square" ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}>Square</button>
                                    <button type="button" onClick={() => onChange("shape", "rounded-square")} className={cn("py-1.5 text-xs font-medium rounded-md transition-colors", placeholder.shape === "rounded-square" ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}>Rounded</button>
                                    <button type="button" onClick={() => onChange("shape", "circle")} className={cn("py-1.5 text-xs font-medium rounded-md transition-colors", placeholder.shape === "circle" ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900")}>Circle</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Width (%)</label>
                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.width || 25}%</span>
                                </div>
                                <input type="range" min="5" max="100" value={placeholder.width || 25} onChange={(e) => onChange("width", parseInt(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                            {(!placeholder.shape || placeholder.shape === "rectangle") && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height (%)</label>
                                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.height || 30}%</span>
                                    </div>
                                    <input type="range" min="5" max="100" value={placeholder.height || 30} onChange={(e) => onChange("height", parseInt(e.target.value))} className="w-full accent-blue-600" />
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Palette size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Border Settings</h4>
                            </div>
                            
                            {(!placeholder.shape || placeholder.shape === "rectangle") && (
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Border Radius (%)</label>
                                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.borderRadius || 0}%</span>
                                    </div>
                                    <input type="range" min="0" max="50" value={placeholder.borderRadius || 0} onChange={(e) => onChange("borderRadius", parseInt(e.target.value))} className="w-full accent-blue-600" />
                                </div>
                            )}

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Border Width (px)</label>
                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.borderWidth || 0}px</span>
                                </div>
                                <input type="range" min="0" max="20" value={placeholder.borderWidth || 0} onChange={(e) => onChange("borderWidth", parseInt(e.target.value))} className="w-full accent-blue-600" />
                            </div>

                            {placeholder.borderWidth > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Border Color</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 rounded-full shadow-sm border border-slate-200 overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                value={placeholder.borderColor || "#000000"}
                                                onChange={(e) => onChange("borderColor", e.target.value)}
                                                className="absolute -inset-2 w-12 h-12 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {meta.type === "qr" && (
                    <>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Layout size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Dimensions</h4>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Width (%)</label>
                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.width || placeholder.size || 20}%</span>
                                </div>
                                <input type="range" min="5" max="100" value={placeholder.width || placeholder.size || 20} onChange={(e) => onChange("width", parseInt(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Height (%)</label>
                                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{placeholder.height || placeholder.size || 20}%</span>
                                </div>
                                <input type="range" min="5" max="100" value={placeholder.height || placeholder.size || 20} onChange={(e) => onChange("height", parseInt(e.target.value))} className="w-full accent-blue-600" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                                <Type size={16} /> <h4 className="text-xs font-bold uppercase tracking-wider">Data Settings</h4>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">QR Data Source</label>
                                <select
                                    value={placeholder.dataMode || "studentId"}
                                    onChange={(e) => onChange("dataMode", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-white"
                                >
                                    <option value="studentId">Student ObjectId</option>
                                    <option value="profileUrl">Public Profile Link</option>
                                    <option value="vcard">VCard (Contact Info)</option>
                                </select>
                                <p className="text-[10px] text-slate-400 leading-relaxed">Controls what scanner apps see when they scan this QR code.</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function TemplatesTab() {
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeSide, setActiveSide] = useState("front");
    const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [previewStudent, setPreviewStudent] = useState(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    
    const fileInputRef = useRef(null);
    const canvasContainerRef = useRef(null);

    // Track local file objects for delayed upload
    const [frontImageFile, setFrontImageFile] = useState(null);
    const [backImageFile, setBackImageFile] = useState(null);

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

    const fetchRandomStudent = async () => {
        try {
            const res = await fetch("/api/v1/students?limit=50");
            if (res.ok) {
                const data = await res.json();
                if (data.students && data.students.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.students.length);
                    setPreviewStudent(data.students[randomIndex]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch random student for preview", error);
        }
    };

    useEffect(() => {
        if (isPreviewMode) {
            fetchRandomStudent();
        }
    }, [isPreviewMode]);

    // Keyboard Nudging & Delete
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showEditor || !selectedPlaceholder) return;
            
            // Allow default behavior for input/textarea elements
            if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
                return;
            }

            // Prevent scrolling when nudging
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 5 : 0.5; // Hold Shift for larger steps
                const sideKey = activeSide === "front" ? "frontPlaceholders" : "backPlaceholders";
                
                setForm(prev => {
                    const current = prev[sideKey][selectedPlaceholder];
                    if (!current) return prev;
                    let { x, y } = current;
                    if (e.key === "ArrowUp") y = Math.max(0, y - step);
                    if (e.key === "ArrowDown") y = Math.min(100, y + step);
                    if (e.key === "ArrowLeft") x = Math.max(0, x - step);
                    if (e.key === "ArrowRight") x = Math.min(100, x + step);
                    return {
                        ...prev,
                        [sideKey]: { ...prev[sideKey], [selectedPlaceholder]: { ...current, x, y } }
                    };
                });
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                handlePlaceholderChange(selectedPlaceholder, "enabled", false);
                setSelectedPlaceholder(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showEditor, selectedPlaceholder, activeSide]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/id-card-templates");
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e, side) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Generate local preview URL
        const previewUrl = URL.createObjectURL(file);
        
        if (side === "front") {
            setFrontImageFile(file);
            setForm(prev => ({ ...prev, frontImageUrl: previewUrl }));
        } else {
            setBackImageFile(file);
            setForm(prev => ({ ...prev, backImageUrl: previewUrl }));
        }
        
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadFileToServer = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.url;
    };

    const getDefaultPlaceholders = (side) => {
        const placeholders = {};
        const keys = side === "front" ? PLACEHOLDER_KEYS.front : PLACEHOLDER_KEYS.back;
        keys.forEach((key, index) => {
            const isImage = PLACEHOLDER_META[key].type === "image";
            const isQR = PLACEHOLDER_META[key].type === "qr";
            placeholders[key] = {
                x: 50,
                y: 20 + index * 10,
                enabled: true,
                ...(isImage ? { width: 25, height: 30, borderRadius: 0, borderWidth: 0 } : isQR ? { width: 20, height: 20, dataMode: "studentId" } : { fontSize: 14, fontFamily: "Arial", fontWeight: "normal", color: "#000000", textAlign: "center", textTransform: "none" })
            };
        });
        return placeholders;
    };

    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Template name is required");
        
        try {
            setLoading(true);
            let finalFrontUrl = form.frontImageUrl;
            let finalBackUrl = form.backImageUrl;

            if (!finalFrontUrl) return toast.error("Front image is required");
            if (!finalBackUrl) return toast.error("Back image is required");

            // Upload pending files if any
            if (frontImageFile) {
                finalFrontUrl = await uploadFileToServer(frontImageFile);
            }
            if (backImageFile) {
                finalBackUrl = await uploadFileToServer(backImageFile);
            }

            const payload = {
                name: form.name,
                frontImageUrl: finalFrontUrl,
                backImageUrl: finalBackUrl,
                frontPlaceholders: Object.keys(form.frontPlaceholders).length ? form.frontPlaceholders : getDefaultPlaceholders("front"),
                backPlaceholders: Object.keys(form.backPlaceholders).length ? form.backPlaceholders : getDefaultPlaceholders("back")
            };

            const url = editingId ? `/api/v1/id-card-templates/${editingId}` : "/api/v1/id-card-templates";
            const method = editingId ? "PATCH" : "POST";
            const res = await fetch(url, {
                method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Template saved successfully");
                resetForm();
                setShowEditor(false);
                fetchTemplates();
            } else {
                toast.error("Failed to save template");
            }
        } catch (error) {
            toast.error("Failed to save template");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        const res = await fetch(`/api/v1/id-card-templates/${id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Template deleted");
            fetchTemplates();
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setSelectedPlaceholder(null);
        setFrontImageFile(null);
        setBackImageFile(null);
        setIsPreviewMode(false);
        setForm({ name: "", frontImageUrl: "", backImageUrl: "", frontPlaceholders: {}, backPlaceholders: {} });
    };

    const handleEditTemplate = (template) => {
        setEditingId(template._id);
        setForm({
            name: template.name,
            frontImageUrl: template.frontImageUrl,
            backImageUrl: template.backImageUrl,
            frontPlaceholders: template.frontPlaceholders || getDefaultPlaceholders("front"),
            backPlaceholders: template.backPlaceholders || getDefaultPlaceholders("back")
        });
        setFrontImageFile(null);
        setBackImageFile(null);
        setShowEditor(true);
        setActiveSide("front");
    };

    const handlePlaceholderChange = (key, field, value) => {
        const sideKey = activeSide === "front" ? "frontPlaceholders" : "backPlaceholders";
        setForm(prev => ({
            ...prev,
            [sideKey]: {
                ...prev[sideKey],
                [key]: { ...prev[sideKey][key], [field]: value }
            }
        }));
    };

    const activePlaceholders = activeSide === "front" ? form.frontPlaceholders : form.backPlaceholders;
    const currentImageUrl = activeSide === "front" ? form.frontImageUrl : form.backImageUrl;

    const getDynamicMeta = (key, baseMeta) => {
        if (!isPreviewMode || !previewStudent) return baseMeta;
        
        const dynamicMeta = { ...baseMeta };
        const p = previewStudent.profile || {};
        
        switch (key) {
            case "studentName": dynamicMeta.sample = `${p.firstName || ""} ${p.lastName || ""}`.trim() || "John Doe"; break;
            case "studentId": dynamicMeta.sample = `ID: ${previewStudent.enrollmentNumber || "12345"}`; break;
            case "rollNumber": dynamicMeta.sample = `Roll: ${previewStudent.enrollmentNumber || "42"}`; break;
            case "batch": dynamicMeta.sample = previewStudent.batch?.name || "Batch 2026"; break;
            case "dateOfAdmission": dynamicMeta.sample = `Accepted: ${previewStudent.createdAt ? new Date(previewStudent.createdAt).toLocaleDateString() : "Sep 2024"}`; break;
            case "studentPhoto": 
                if (p.avatar) {
                    dynamicMeta.sample = "";
                    dynamicMeta.imageUrl = p.avatar;
                }
                break;
            case "qrCode":
                dynamicMeta.sample = "";
                // To display a dummy QR for preview, we can use a placeholder image or leave it blank
                dynamicMeta.imageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Student";
                break;
        }
        return dynamicMeta;
    };

    // View: List
    if (!showEditor) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">ID Card Templates</h1>
                        <p className="text-slate-600 mt-1">Manage ID card designs with draggable placeholders</p>
                    </div>
                    <Button onClick={() => { resetForm(); setShowEditor(true); setForm(f => ({ ...f, frontPlaceholders: getDefaultPlaceholders("front"), backPlaceholders: getDefaultPlaceholders("back") })); }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus size={20} /> New Template
                    </Button>
                </div>
                
                {templates.length === 0 && !loading && (
                    <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-slate-500">No templates found. Create one to get started.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <Card key={template._id} className="overflow-hidden hover:shadow-lg transition-shadow border-slate-200">
                            <div className="bg-slate-100 h-32 relative flex items-center justify-center border-b border-slate-100">
                                {template.frontImageUrl ? (
                                     <img src={template.frontImageUrl} alt={template.name} className="h-full object-contain p-2" />
                                ) : (
                                    <Layout size={32} className="text-slate-300" />
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-slate-800 text-lg">{template.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">Both sides configured</p>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)} className="flex-1"><Edit2 size={16} className="mr-2"/> Edit</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(template._id)} className="text-red-500 hover:bg-red-50 hover:text-red-600 px-3"><Trash2 size={16} /></Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // View: Editor
    return (
        <Card className="p-0 overflow-hidden shadow-2xl border-slate-200">
            <div className={cn("flex flex-col h-full bg-slate-50", isFullscreen ? "fixed inset-0 z-50" : "min-h-[750px]")}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-lg text-slate-800">{editingId ? "Edit Template" : "New Template"}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all", isPreviewMode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                            >
                                {isPreviewMode ? <Eye size={16} /> : <EyeOff size={16} />}
                                Preview Data
                            </button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="text-slate-500">
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowEditor(false)} className="text-slate-500">
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar */}
                    <div className="w-64 border-r bg-white space-y-0 overflow-y-auto shrink-0 flex flex-col shadow-[4px_0_15px_-5px_rgba(0,0,0,0.05)] z-10">
                        <div className="p-4 space-y-4 border-b">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Template Name</label>
                                <input
                                    type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Standard ID 2024"
                                    className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                                />
                            </div>

                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                <button
                                    type="button" onClick={() => { setActiveSide("front"); setSelectedPlaceholder(null); }}
                                    className={cn("flex-1 py-1.5 text-sm font-semibold rounded-md transition-all", activeSide === "front" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600")}
                                >Front</button>
                                <button
                                    type="button" onClick={() => { setActiveSide("back"); setSelectedPlaceholder(null); }}
                                    className={cn("flex-1 py-1.5 text-sm font-semibold rounded-md transition-all", activeSide === "back" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600")}
                                >Back</button>
                            </div>

                            <div>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, activeSide)} className="hidden" />
                                <Button type="button" variant="outline" className="w-full bg-slate-50 hover:bg-slate-100" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={16} className="mr-2" /> Upload {activeSide === "front" ? "Front" : "Back"}
                                </Button>
                                {currentImageUrl && (
                                    <p className="text-[10px] text-center text-slate-400 mt-2">Will be saved upon submit.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Placeholders</label>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">Toggle fields to include them on the {activeSide} side.</p>
                            
                            <div className="space-y-1">
                                {Object.entries(activePlaceholders || {}).map(([key, p]) => {
                                    const meta = PLACEHOLDER_META[key];
                                    if (!meta) return null;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => {
                                                if (p.enabled) setSelectedPlaceholder(key);
                                            }}
                                            className={cn("flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border", 
                                                selectedPlaceholder === key ? "bg-blue-50 border-blue-200 shadow-sm" : "border-transparent hover:bg-slate-50")}
                                        >
                                            <input
                                                type="checkbox" checked={p.enabled}
                                                onChange={(e) => {
                                                    handlePlaceholderChange(key, "enabled", e.target.checked);
                                                    if (!e.target.checked && selectedPlaceholder === key) setSelectedPlaceholder(null);
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className={cn("text-sm font-medium", selectedPlaceholder === key ? "text-blue-700" : "text-slate-700")}>{meta.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 overflow-auto relative p-8 flex items-center justify-center bg-[url('/img/checkerboard.png')] bg-repeat" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        {currentImageUrl ? (
                            <div
                                ref={canvasContainerRef}
                                className="relative bg-white shadow-2xl overflow-hidden flex-shrink-0 ring-1 ring-slate-200/50"
                                style={{ width: `320px`, height: `480px`, transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
                            >
                                <img src={currentImageUrl} alt="Template" className="absolute inset-0 w-full h-full object-fill pointer-events-none" />
                                {Object.entries(activePlaceholders).map(([key, p]) => (
                                    <DraggablePlaceholder
                                        key={key} id={key} placeholder={p} meta={getDynamicMeta(key, PLACEHOLDER_META[key])}
                                        containerRef={canvasContainerRef} zoom={zoom}
                                        isSelected={selectedPlaceholder === key} onSelect={setSelectedPlaceholder}
                                        onDrag={(id, x, y) => handlePlaceholderChange(id, "x", x) || handlePlaceholderChange(id, "y", y)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center max-w-sm p-8 bg-white/50 backdrop-blur rounded-2xl border border-dashed border-slate-300 shadow-sm">
                                <div className="mb-4 w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 text-slate-300">
                                    <Upload size={32} />
                                </div>
                                <h3 className="text-slate-700 font-bold mb-1">No Background Image</h3>
                                <p className="text-sm">Upload a {activeSide} background image to start placing elements.</p>
                            </div>
                        )}
                        
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white p-1.5 rounded-full shadow-lg border border-slate-200 z-30">
                            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ZoomOut size={16} /></button>
                            <span className="text-xs font-bold w-12 text-center text-slate-700">{Math.round(zoom)}%</span>
                            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ZoomIn size={16} /></button>
                        </div>
                    </div>

                    {/* Right Style Panel */}
                    <StylePanel
                        selectedPlaceholder={selectedPlaceholder}
                        placeholder={selectedPlaceholder ? activePlaceholders[selectedPlaceholder] : null}
                        meta={selectedPlaceholder ? PLACEHOLDER_META[selectedPlaceholder] : null}
                        onChange={(field, value) => handlePlaceholderChange(selectedPlaceholder, field, value)}
                    />
                </div>

                <div className="p-4 border-t bg-white shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.02)] flex justify-end gap-3 z-10">
                    <Button variant="outline" onClick={() => setShowEditor(false)} className="min-w-[100px]">Cancel</Button>
                    <Button onClick={handleSaveTemplate} className="bg-blue-600 hover:bg-blue-700 min-w-[140px] shadow-sm" disabled={loading}>
                        {loading ? "Saving..." : "Save Template"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
