"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// Mounts only when the modal is open — camera starts on mount, stops on unmount
function FaceCaptureContent({ user, onClose, onSuccess }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const faceapiRef = useRef(null);

    const [loadingModels, setLoadingModels] = useState(true);
    const [detecting, setDetecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [descriptor, setDescriptor] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const stopStream = () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };

        (async () => {
            try {
                const faceapi = await import("@vladmandic/face-api");
                faceapiRef.current = faceapi;
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                if (cancelled) return;
                setLoadingModels(false);

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                });
                if (cancelled) { stopStream(); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("EnrollFace init error:", err);
                if (!cancelled) {
                    toast.error(err.message || "Camera / model init failed");
                    setLoadingModels(false);
                }
            }
        })();

        return () => { cancelled = true; stopStream(); };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !faceapiRef.current) return;
        setDetecting(true);
        try {
            const det = await faceapiRef.current
                .detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (!det) { toast.error("No face detected — align and retry."); return; }
            setDescriptor(Array.from(det.descriptor));
            setFaceDetected(true);
            toast.success("Face captured!");
        } catch (err) {
            toast.error("Capture failed: " + err.message);
        } finally {
            setDetecting(false);
        }
    };

    const handleSave = async () => {
        if (!descriptor || !user?._id) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/users/${user._id}/face`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ descriptor }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            toast.success("Face biometrics saved!");
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Video viewport */}
            <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
                {loadingModels && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <span className="text-xs">Loading AI models…</span>
                    </div>
                )}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                />
                {faceDetected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <CheckCircle2 className="w-16 h-16 text-emerald-400 drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={loadingModels || detecting || saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                    {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {faceDetected ? "Re-scan" : "Scan Face"}
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!faceDetected || saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save
                </button>
            </div>
        </div>
    );
}

export default function EnrollFaceModal({ user, isOpen, onClose, onSuccess }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enroll Face Biometrics" className="max-w-md">
            {/* Only mount camera content when modal is actually open */}
            {isOpen && <FaceCaptureContent user={user} onClose={onClose} onSuccess={onSuccess} />}
        </Modal>
    );
}
