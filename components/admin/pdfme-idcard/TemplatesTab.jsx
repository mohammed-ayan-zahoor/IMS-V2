"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Copy, Check, Upload, ArrowLeft, Loader2, Sparkles, AlertCircle, LayoutGrid, FileText, Maximize2, Minimize2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

const AVAILABLE_PLACEHOLDERS = [
    { key: "studentName", label: "Student Full Name" },
    { key: "grNumber", label: "GR Number" },
    { key: "rollNo", label: "Roll Number" },
    { key: "enrollmentNo", label: "Enrollment Number" },
    { key: "batchName", label: "Batch / Section" },
    { key: "courseName", label: "Course / Standard" },
    { key: "studentPhoto", label: "Student Photo (Image)" },
    { key: "qrCode", label: "QR Code (vCard / Profile)" },
    { key: "admissionDate", label: "Admission Date" },
    { key: "dob", label: "Date of Birth" },
    { key: "bloodGroup", label: "Blood Group" },
    { key: "fatherName", label: "Father Name" },
    { key: "motherName", label: "Mother Name" },
    { key: "phone", label: "Contact Phone" },
    { key: "email", label: "Contact Email" },
    { key: "fullAddress", label: "Student Address" },
    { key: "instituteName", label: "Institute Name" },
    { key: "institutePhone", label: "Institute Phone" }
];

export default function TemplatesTab() {
    const toast = useToast();
    
    // Client-side library load state
    const [pdfme, setPdfme] = useState(null);
    const [loadingLibs, setLoadingLibs] = useState(true);

    // Core Template Data
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    
    // UI Panels
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Upload Processing States
    const [processingFrontBg, setProcessingFrontBg] = useState(false);
    const [processingBackBg, setProcessingBackBg] = useState(false);

    const designerRef = useRef(null);
    const designerInstance = useRef(null);
    const containerRef = useRef(null);

    const toggleFullscreen = async () => {
        try {
            const docEl = document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
                if (req) {
                    await req.call(docEl);
                } else {
                    setIsFullscreen(true);
                }
            } else {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) {
                    await exit.call(document);
                } else {
                    setIsFullscreen(false);
                }
            }
        } catch (err) {
            console.error("Fullscreen toggle failed:", err);
            setIsFullscreen(prev => !prev);
        }
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 150);
    };

    const exitNativeFullscreen = async () => {
        try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) {
                    await exit.call(document);
                }
            }
        } catch (e) {
            console.error("Failed to exit native fullscreen:", e);
        }
        setIsFullscreen(false);
    };

    // Form inputs
    const [form, setForm] = useState({
        name: "",
        orientation: "horizontal", // "horizontal" or "vertical"
        width: 86.5,
        height: 54.5,
        templateJson: {
            basePdf: {
                width: 86.5,
                height: 54.5,
                padding: [0, 0, 0, 0]
            },
            schemas: [
                [], // Page 1 elements
                []  // Page 2 elements
            ]
        }
    });

    const handleOrientationChange = async (newOrientation) => {
        const isVertical = newOrientation === "vertical";
        const w = isVertical ? 54.5 : 86.5;
        const h = isVertical ? 86.5 : 54.5;

        let updatedTemplate = {
            ...form.templateJson,
            basePdf: typeof form.templateJson.basePdf === "string" 
                ? form.templateJson.basePdf
                : { ...form.templateJson.basePdf, width: w, height: h }
        };

        // Regenerate double-sided PDF background if base64 images exist
        if (form.frontBgBase64 || form.backBgBase64) {
            try {
                const { generate } = pdfme.generator;
                const { image } = pdfme.schemas;

                const tempTemplate = {
                    basePdf: { width: w, height: h, padding: [0, 0, 0, 0] },
                    schemas: [
                        [ { name: "bgFront", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ],
                        [ { name: "bgBack", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ]
                    ]
                };

                const oldInputFront = form.frontBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                const oldInputBack = form.backBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

                const pdfUint8Array = await generate({
                    template: tempTemplate,
                    inputs: [
                        { bgFront: oldInputFront, bgBack: oldInputBack }
                    ],
                    plugins: { image }
                });

                let binary = "";
                const len = pdfUint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(pdfUint8Array[i]);
                }
                const base64Pdf = `data:application/pdf;base64,${window.btoa(binary)}`;

                updatedTemplate = {
                    ...updatedTemplate,
                    basePdf: base64Pdf
                };
            } catch (err) {
                console.error("Orientation swap background generation failed:", err);
            }
        } else {
            updatedTemplate.basePdf = {
                width: w,
                height: h,
                padding: [0, 0, 0, 0]
            };
        }

        setForm(prev => ({
            ...prev,
            orientation: newOrientation,
            width: w,
            height: h,
            templateJson: updatedTemplate
        }));

        if (designerInstance.current) {
            designerInstance.current.updateTemplate(updatedTemplate);
        }
    };

    const handleDimensionChange = async (w, h) => {
        let updatedTemplate = {
            ...form.templateJson,
            basePdf: typeof form.templateJson.basePdf === "string" 
                ? form.templateJson.basePdf
                : { ...form.templateJson.basePdf, width: w, height: h }
        };

        // Regenerate double-sided PDF background if base64 images exist
        if (form.frontBgBase64 || form.backBgBase64) {
            try {
                const { generate } = pdfme.generator;
                const { image } = pdfme.schemas;

                const tempTemplate = {
                    basePdf: { width: w, height: h, padding: [0, 0, 0, 0] },
                    schemas: [
                        [ { name: "bgFront", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ],
                        [ { name: "bgBack", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ]
                    ]
                };

                const oldInputFront = form.frontBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                const oldInputBack = form.backBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

                const pdfUint8Array = await generate({
                    template: tempTemplate,
                    inputs: [
                        { bgFront: oldInputFront, bgBack: oldInputBack }
                    ],
                    plugins: { image }
                });

                let binary = "";
                const len = pdfUint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(pdfUint8Array[i]);
                }
                const base64Pdf = `data:application/pdf;base64,${window.btoa(binary)}`;

                updatedTemplate = {
                    ...updatedTemplate,
                    basePdf: base64Pdf
                };
            } catch (err) {
                console.error("Dimensions change background generation failed:", err);
            }
        } else {
            updatedTemplate.basePdf = {
                width: w,
                height: h,
                padding: [0, 0, 0, 0]
            };
        }

        setForm(prev => ({
            ...prev,
            width: w,
            height: h,
            templateJson: updatedTemplate
        }));

        if (designerInstance.current) {
            designerInstance.current.updateTemplate(updatedTemplate);
        }
    };

    // 1. Dynamic Client Side Loader for PDFMe
    useEffect(() => {
        Promise.all([
            import("@pdfme/ui"),
            import("@pdfme/generator"),
            import("@pdfme/schemas"),
            import("@pdfme/common")
        ]).then(([ui, generator, schemas, common]) => {
            setPdfme({ ui, generator, schemas, common });
            setLoadingLibs(false);
        }).catch(err => {
            console.error("Failed to load PDFMe client libraries:", err);
            toast.error("Failed to load PDF engine components.");
            setLoadingLibs(false);
        });

        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Mounting and cleanup of PDFMe Designer
    useEffect(() => {
        if (!pdfme || !designerRef.current || !showEditor) return;

        const { Designer } = pdfme.ui;
        
        // Resolve schemas safely supporting potential bundler ESM/CJS interop wrappers
        const schemasModule = pdfme.schemas;
        const targetSchemas = schemasModule?.text ? schemasModule : (schemasModule?.default || schemasModule);
        
        const text = targetSchemas?.text;
        const image = targetSchemas?.image;
        const barcodes = targetSchemas?.barcodes;
        const qrcode = barcodes?.qrcode || barcodes?.default?.qrcode || barcodes;

        // Custom image plugin wrapper to support shapes & border radius inside the properties panel
        const customImage = {
            ...image,
            propPanel: {
                ...image.propPanel,
                schema: (propPanelProps) => {
                    const defaultSchema = typeof image.propPanel.schema === "function"
                        ? image.propPanel.schema(propPanelProps)
                        : image.propPanel.schema;
                    return {
                        ...defaultSchema,
                        imageShape: {
                            title: "Frame Shape",
                            type: "string",
                            default: "rectangle",
                            props: {
                                options: [
                                    { label: "Rectangle (Raw)", value: "rectangle" },
                                    { label: "Circle", value: "circle" },
                                    { label: "Square (1:1 crop)", value: "square" },
                                    { label: "Rounded Rectangle", value: "rounded" }
                                ]
                            },
                            span: 24
                        },
                        imageBorderRadius: {
                            title: "Rounded Corners (mm)",
                            type: "number",
                            default: 0,
                            props: {
                                min: 0,
                                max: 50,
                                step: 1
                            },
                            span: 24
                        }
                    };
                }
            },
            ui: async (arg) => {
                await image.ui(arg);
                const { rootElement, schema } = arg;
                const img = rootElement.querySelector("img");
                if (img) {
                    img.style.objectFit = "cover";
                    if (schema.imageShape === "circle") {
                        img.style.borderRadius = "50%";
                        img.style.aspectRatio = "1 / 1";
                    } else if (schema.imageShape === "square") {
                        img.style.borderRadius = "0px";
                        img.style.aspectRatio = "1 / 1";
                    } else if (schema.imageShape === "rounded") {
                        const borderRadius = schema.imageBorderRadius || 0;
                        const scale = arg.scale || 1;
                        const pxRadius = borderRadius * 3.78 * scale;
                        img.style.borderRadius = `${pxRadius}px`;
                        img.style.aspectRatio = "";
                    } else {
                        img.style.borderRadius = "0px";
                        img.style.aspectRatio = "";
                    }
                }
            }
        };

        try {
            // Setup canvas designer inside DOM container
            designerInstance.current = new Designer({
                domContainer: designerRef.current,
                template: form.templateJson,
                plugins: { text, image: customImage, qrcode }
            });

            // Sync layout changes
            designerInstance.current.onChangeTemplate((updated) => {
                setForm(prev => ({ ...prev, templateJson: updated }));
            });
        } catch (err) {
            console.error("Failed to initialize PDFMe Designer canvas:", err);
        }

        return () => {
            if (designerInstance.current) {
                try {
                    designerInstance.current.destroy();
                } catch (e) {}
                designerInstance.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfme, showEditor, editingId]);    // 2.5. Sync native fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isNativeFs = !!(
                document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement
            );
            setIsFullscreen(isNativeFs);
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 150);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, []);
    // 3. Scroll to top when editor is active
    useEffect(() => {
        if (!designerRef.current) return;
        
        const scrollContainer = designerRef.current.closest('.overflow-y-auto');
        if (showEditor) {
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }
            
            // Trigger a resize event to make sure PDFMe designer aligns its canvas
            const resizeTimer = setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 150);

            return () => {
                clearTimeout(resizeTimer);
            };
        }
    }, [showEditor]);

    // 3.5. Keyboard shortcuts for saving and exiting fullscreen
    useEffect(() => {
        if (!showEditor) return;

        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if ((e.metaKey || e.ctrlKey) && key === "s") {
                e.preventDefault();
                handleSaveTemplate(e);
            }
            if (e.key === "Escape" && isFullscreen) {
                e.preventDefault();
                exitNativeFullscreen();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showEditor, isFullscreen]);

    const fetchTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const res = await fetch("/api/v1/id-card-templates-pdfme");
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error("Error loading templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleCopy = (key) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        toast.success(`Copied key "${key}"`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // 3. Image conversion to PDF background
    const processBackgroundImage = async (file, side) => {
        if (!pdfme) return;
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            const base64Image = e.target.result;
            const isFront = side === "front";
            if (isFront) setProcessingFrontBg(true);
            else setProcessingBackBg(true);

            try {
                const { generate } = pdfme.generator;
                const { image } = pdfme.schemas;
                
                // Build a 2-page PDF if we have front and back background configurations
                const width = form.width || 86.5;
                const height = form.height || 54.5;

                // Determine what backgrounds already exist in the basePdf
                let currentFrontBg = null;
                let currentBackBg = null;

                // Extract previous image elements if they were already mapped in schemas
                // Or we can just build a temporary PDF compilation document
                const tempTemplate = {
                    basePdf: { width, height, padding: [0, 0, 0, 0] },
                    schemas: [
                        [ { name: "bgFront", type: "image", position: { x: 0, y: 0 }, width, height } ],
                        [ { name: "bgBack", type: "image", position: { x: 0, y: 0 }, width, height } ]
                    ]
                };

                // Retrieve existing background images from form state if present
                const oldInputFront = form.frontBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                const oldInputBack = form.backBgBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

                const frontVal = isFront ? base64Image : oldInputFront;
                const backVal = isFront ? oldInputBack : base64Image;

                // Generate vector PDF containing backgrounds
                const pdfUint8Array = await generate({
                    template: tempTemplate,
                    inputs: [
                        { bgFront: frontVal, bgBack: backVal }
                    ],
                    plugins: { image }
                });

                // Convert PDF to base64
                let binary = "";
                const len = pdfUint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(pdfUint8Array[i]);
                }
                const base64Pdf = `data:application/pdf;base64,${window.btoa(binary)}`;

                // Update template basePdf configuration
                const updatedTemplate = {
                    ...form.templateJson,
                    basePdf: base64Pdf
                };

                setForm(prev => ({
                    ...prev,
                    templateJson: updatedTemplate,
                    frontBgBase64: frontVal,
                    backBgBase64: backVal
                }));

                if (designerInstance.current) {
                    designerInstance.current.updateTemplate(updatedTemplate);
                }

                toast.success(`Successfully loaded ${side} side background!`);
            } catch (err) {
                console.error("Background PDF processing failed:", err);
                toast.error("Failed to render background image into card canvas.");
            } finally {
                if (isFront) setProcessingFrontBg(false);
                else setProcessingBackBg(false);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Template name is required");

        let activeTemplateJson = form.templateJson;
        if (designerInstance.current) {
            activeTemplateJson = designerInstance.current.getTemplate();
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                templateJson: {
                    ...activeTemplateJson,
                    width: form.width,
                    height: form.height,
                    orientation: form.orientation,
                    frontBgBase64: form.frontBgBase64,
                    backBgBase64: form.backBgBase64
                }
            };

            const url = editingId ? `/api/v1/id-card-templates-pdfme/${editingId}` : "/api/v1/id-card-templates-pdfme";
            const method = editingId ? "PATCH" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Template saved successfully");
                await exitNativeFullscreen();
                setShowEditor(false);
                resetForm();
                fetchTemplates();
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Failed to save template");
            }
        } catch (error) {
            console.error("Save template error:", error);
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            const res = await fetch(`/api/v1/id-card-templates-pdfme/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Template deleted");
                fetchTemplates();
            } else {
                toast.error("Failed to delete template");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    const handleEditTemplate = async (template) => {
        setEditingId(template._id);
        
        let w = template.templateJson?.width;
        let h = template.templateJson?.height;
        let orientation = template.templateJson?.orientation;
        
        if (!w || !h) {
            const basePdf = template.templateJson?.basePdf;
            if (typeof basePdf === "object" && basePdf.width && basePdf.height) {
                w = basePdf.width;
                h = basePdf.height;
            } else {
                // Heuristic: check if any elements exist in schemas that have coordinates past landscape boundary
                w = 86.5;
                h = 54.5;
                const firstPage = template.templateJson?.schemas?.[0] || [];
                const anyPortrait = firstPage.some(el => {
                    const pos = el.position || {};
                    const elementHeight = el.height || 0;
                    return (pos.y + elementHeight) > 54.5;
                });
                if (anyPortrait) {
                    w = 54.5;
                    h = 86.5;
                }
            }
        }
        
        if (!orientation) {
            orientation = w < h ? "vertical" : "horizontal";
        }

        let activeTemplateJson = template.templateJson;

        // Self-healing: if base64 backgrounds exist, regenerate the PDF background fresh to bypass any expired or broken Cloudinary URLs
        const frontBg = template.templateJson?.frontBgBase64;
        const backBg = template.templateJson?.backBgBase64;
        if (pdfme && (frontBg || backBg)) {
            try {
                const { generate } = pdfme.generator;
                const { image } = pdfme.schemas;

                const tempTemplate = {
                    basePdf: { width: w, height: h, padding: [0, 0, 0, 0] },
                    schemas: [
                        [ { name: "bgFront", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ],
                        [ { name: "bgBack", type: "image", position: { x: 0, y: 0 }, width: w, height: h } ]
                    ]
                };

                const oldInputFront = frontBg || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                const oldInputBack = backBg || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

                const pdfUint8Array = await generate({
                    template: tempTemplate,
                    inputs: [
                        { bgFront: oldInputFront, bgBack: oldInputBack }
                    ],
                    plugins: { image }
                });

                let binary = "";
                const len = pdfUint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(pdfUint8Array[i]);
                }
                const base64Pdf = `data:application/pdf;base64,${window.btoa(binary)}`;

                activeTemplateJson = {
                    ...activeTemplateJson,
                    basePdf: base64Pdf
                };
            } catch (err) {
                console.error("Self-healing background regeneration failed:", err);
            }
        }

        setForm({
            name: template.name,
            orientation,
            width: w,
            height: h,
            templateJson: activeTemplateJson,
            frontBgBase64: frontBg || "",
            backBgBase64: backBg || ""
        });
        
        setShowEditor(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setIsFullscreen(false);
        setForm({
            name: "",
            orientation: "horizontal",
            width: 86.5,
            height: 54.5,
            templateJson: {
                basePdf: {
                    width: 86.5,
                    height: 54.5,
                    padding: [0, 0, 0, 0]
                },
                schemas: [
                    [],
                    []
                ]
            }
        });
    };

    if (loadingLibs || loadingTemplates) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-slate-500 font-semibold text-sm">Initializing vector PDF workspace...</p>
            </div>
        );
    }

    if (!showEditor) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Card Templates</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Manage vector-scale PDF ID card layouts</p>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowEditor(true); }} 
                        className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 rounded-xl font-bold"
                    >
                        <Plus size={18} className="mr-1.5" /> Create Layout
                    </Button>
                </div>

                {templates.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 rounded-full bg-slate-50 text-slate-400">
                            <FileText size={32} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-700">No PDF templates defined</p>
                            <p className="text-sm text-slate-500 max-w-sm mt-1">Create a vector ID card template using the drag-and-drop designer canvas.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <Card key={template._id} className="overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-all rounded-3xl bg-white flex flex-col justify-between">
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                                            <LayoutGrid size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{template.name}</h3>
                                            <p className="text-slate-500 text-xs">Vector Template • {template.templateJson.schemas?.length || 2} Pages</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">
                                        Dimensions: {template.templateJson.basePdf?.width || 86.5}mm x {template.templateJson.basePdf?.height || 54.5}mm
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2 rounded-b-3xl">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleEditTemplate(template)} 
                                        className="flex-1 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50"
                                    >
                                        <Edit2 size={14} className="mr-1.5" /> Edit Designer
                                    </Button>
                                    <button 
                                        onClick={() => handleDeleteTemplate(template._id)} 
                                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl hover:text-red-600 transition-colors border border-slate-100 bg-white"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={cn(
            "bg-white flex flex-col w-full min-w-0 relative",
            isFullscreen 
                ? "fixed inset-0 z-[800] w-screen h-screen rounded-none border-none shadow-none overflow-hidden" 
                : "border border-slate-200/60 shadow-xl rounded-3xl overflow-hidden h-[750px]"
        )}>
            {saving && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="bg-white/90 p-6 rounded-3xl shadow-xl flex flex-col items-center space-y-3 border border-slate-200/50 max-w-xs text-center">
                        <Loader2 className="animate-spin text-blue-600 animate-duration-1000" size={36} />
                        <h4 className="font-bold text-slate-800 text-sm">Saving Template...</h4>
                        <p className="text-xs text-slate-500 font-medium">Uploading background assets & syncing configurations</p>
                    </div>
                </div>
            )}
            {/* Editor Top Bar */}
            <div className="flex flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-white shrink-0 z-20 relative">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={async () => { await exitNativeFullscreen(); setShowEditor(false); }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <input
                            type="text"
                            placeholder="Enter Template Name..."
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="text-lg font-bold text-slate-800 outline-none border-b border-transparent focus:border-blue-500 px-1 py-0.5 rounded transition-all w-64 placeholder:text-slate-400 placeholder:font-bold"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 bg-white hover:text-slate-900 flex items-center gap-1.5 font-bold text-xs shadow-sm hover:shadow active:scale-95 duration-150"
                        title={isFullscreen ? "Minimize Screen (Esc)" : "Fullscreen Mode"}
                    >
                        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        <span>{isFullscreen ? "Minimize" : "Fullscreen"}</span>
                    </button>

                    <Button
                        onClick={handleSaveTemplate}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md shadow-blue-500/10 transition-all"
                        title="Save Template (Cmd + S / Ctrl + S)"
                    >
                        {saving ? (
                            <><Loader2 size={16} className="animate-spin mr-1.5" /> Saving...</>
                        ) : (
                            "Save Template"
                        )}
                    </Button>
                </div>
            </div>

            {/* Split Panel Area */}
            <div className="flex-1 flex min-w-0 overflow-hidden min-h-0 bg-slate-50/50">
                
                {/* 1. Left Sidebar: Available Placeholders */}
                <div className="w-72 bg-white border-r border-slate-100 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            <Sparkles size={16} className="text-blue-500" />
                            Placeholders Palette
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                            Name your element using the exact key below to map variables automatically.
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {AVAILABLE_PLACEHOLDERS.map((ph) => {
                            const isCopied = copiedKey === ph.key;
                            return (
                                <div 
                                    key={ph.key} 
                                    onClick={() => handleCopy(ph.key)}
                                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
                                >
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-700 font-mono truncate">{ph.key}</div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{ph.label}</div>
                                    </div>
                                    <button 
                                        className={cn(
                                            "p-1.5 rounded-lg border transition-all text-slate-400 opacity-0 group-hover:opacity-100",
                                            isCopied ? "bg-green-50 border-green-200 text-green-600 opacity-100" : "bg-white border-slate-200"
                                        )}
                                    >
                                        {isCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Center Workspace: PDFMe Editor */}
                <div className="flex-1 min-w-0 p-6 overflow-auto flex flex-col justify-center items-center">
                    <div className={cn(
                        "w-full h-full bg-white border border-slate-200/80 shadow-md rounded-2xl overflow-hidden relative",
                        isFullscreen ? "max-w-none" : "max-w-5xl"
                    )}>
                        <div ref={designerRef} className="w-full h-full" />
                    </div>
                </div>

                {/* 3. Right Sidebar: Background configuration */}
                <div className="w-72 bg-white border-l border-slate-100 flex flex-col shrink-0 p-4 space-y-6 overflow-y-auto">
                    <div>
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                            Card Backgrounds
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
                            Upload high-res PNG/JPG designs. We will lock them into the PDF layout.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Orientation Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Orientation</label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                                <button
                                    type="button"
                                    onClick={() => handleOrientationChange("horizontal")}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        form.orientation === "horizontal"
                                            ? "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Horizontal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOrientationChange("vertical")}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        form.orientation === "vertical"
                                            ? "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Vertical
                                </button>
                            </div>
                        </div>

                        {/* Custom Dimensions */}
                        <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Custom Dimensions (mm)</label>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <div className="space-y-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Width</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={form.width}
                                        onChange={(e) => handleDimensionChange(parseFloat(e.target.value) || 0, form.height)}
                                        className="w-full text-xs font-bold bg-white border border-slate-200/80 p-2 rounded-xl focus:border-blue-500 outline-none text-slate-700 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Height</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={form.height}
                                        onChange={(e) => handleDimensionChange(form.width, parseFloat(e.target.value) || 0)}
                                        className="w-full text-xs font-bold bg-white border border-slate-200/80 p-2 rounded-xl focus:border-blue-500 outline-none text-slate-700 shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Front Background */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Front Background Image</label>
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-slate-50/50 transition-all rounded-xl p-4 cursor-pointer text-center group min-h-[90px] relative">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) processBackgroundImage(file, "front");
                                    }}
                                    className="hidden"
                                    disabled={processingFrontBg}
                                />
                                {processingFrontBg ? (
                                    <div className="flex flex-col items-center space-y-1">
                                        <Loader2 className="animate-spin text-blue-500" size={18} />
                                        <span className="text-[10px] text-slate-500 font-semibold">Generating PDF...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-slate-400 group-hover:text-blue-500 transition-colors" size={18} />
                                        <span className="text-[10px] text-slate-500 font-bold mt-1 group-hover:text-slate-700">Upload Front Side</span>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Back Background */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Back Background Image</label>
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-slate-50/50 transition-all rounded-xl p-4 cursor-pointer text-center group min-h-[90px] relative">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) processBackgroundImage(file, "back");
                                    }}
                                    className="hidden"
                                    disabled={processingBackBg}
                                />
                                {processingBackBg ? (
                                    <div className="flex flex-col items-center space-y-1">
                                        <Loader2 className="animate-spin text-blue-500" size={18} />
                                        <span className="text-[10px] text-slate-500 font-semibold">Generating PDF...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-slate-400 group-hover:text-blue-500 transition-colors" size={18} />
                                        <span className="text-[10px] text-slate-500 font-bold mt-1 group-hover:text-slate-700">Upload Back Side</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 bg-blue-50/20 rounded-2xl p-3 border flex gap-2">
                        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={14} />
                        <div className="text-[10px] text-slate-600 font-medium leading-relaxed">
                            Recommended dimensions are standard CR80 (86.5mm x 54.5mm). You can adjust width/height above to match your custom designs. Zero padding is applied to ensure full bleeds.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
