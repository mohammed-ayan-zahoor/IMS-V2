"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/contexts/ToastContext";

const LOCAL_MODEL_URL = "/models/face-api";
const CDN_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

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

        // Start camera immediately
        navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
        }).then(stream => {
            if (cancelled) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        }).catch(err => {
            console.error("Camera access error:", err);
            if (!cancelled) toast.error("Camera access failed: " + err.message);
        });

        // Load models in parallel (local first, CDN fallback)
        (async () => {
            try {
                const faceapi = await import("@vladmandic/face-api");
                faceapiRef.current = faceapi;

                const loadFrom = async (url) => {
                    await Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri(url),
                        faceapi.nets.faceLandmark68Net.loadFromUri(url),
                        faceapi.nets.faceRecognitionNet.loadFromUri(url),
                    ]);
                };

                try {
                    await loadFrom(LOCAL_MODEL_URL);
                } catch (localErr) {
                    console.warn("Local models load failed, falling back to CDN:", localErr);
                    await loadFrom(CDN_MODEL_URL);
                }

                if (!cancelled) setLoadingModels(false);
            } catch (err) {
                console.error("EnrollFace model load error:", err);
                if (!cancelled) {
                    toast.error(err.message || "Face AI model loading failed");
                    setLoadingModels(false);
                }
            }
        })();

        return () => { cancelled = true; stopStream(); };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !faceapiRef.current) {
            toast.error("Camera or AI is not ready yet.");
            return;
        }

        if (videoRef.current.readyState !== 4) {
            toast.error("Camera is warming up — please wait a moment.");
            return;
        }

        setDetecting(true);
        try {
            const faceapi = faceapiRef.current;
            // ponytail: inputSize 160 = 4x fewer pixels than 320, much faster on mobile.
            const tinyOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 });
            let det = await faceapi
                .detectSingleFace(videoRef.current, tinyOpts)
                .withFaceLandmarks()
                .withFaceDescriptor();

            // 2. High-accuracy fallback if tiny detector misses
            if (!det) {
                det = await faceapi
                    .detectSingleFace(videoRef.current)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
            }

            if (!det) {
                toast.error("No face detected — align and retry.");
                return;
            }
            setDescriptor(Array.from(det.descriptor));
            setFaceDetected(true);
            toast.success("Face captured!");
        } catch (err) {
            console.error("Face capture detection error:", err);
            toast.error("Capture failed: " + err.message);
        } finally {
            setDetecting(false);
        }
    };

    const handleSave = async () => {
        const userId = user?._id || user?.id;
        if (!descriptor || !userId) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/users/${userId}/face`, {
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
            <div
                className={`relative bg-black rounded-xl overflow-hidden flex items-center justify-center ${loadingModels || detecting ? "ring-2 ring-indigo-400 ring-offset-2 animate-pulse" : ""}`}
                style={{ aspectRatio: "4/3" }}
            >
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
                {detecting && !faceDetected && (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10">
                        <span className="flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block animate-pulse" />
                            Scanning your face…
                        </span>
                    </div>
                )}
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
    const userName = user?.profile?.firstName 
        ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() 
        : user?.name || user?.email || "User";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Enroll Face - ${userName}`} className="max-w-md">
            {/* Only mount camera content when modal is actually open */}
            {isOpen && <FaceCaptureContent user={user} onClose={onClose} onSuccess={onSuccess} />}
        </Modal>
    );
}
