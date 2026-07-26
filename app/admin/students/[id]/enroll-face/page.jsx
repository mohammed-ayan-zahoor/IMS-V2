"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export default function EnrollFacePage() {
    const { id } = useParams();
    const router = useRouter();

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const faceapiRef = useRef(null);

    const [student, setStudent] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);  // camera streaming?
    const [modelsReady, setModelsReady] = useState(false);  // face-api loaded?
    const [detecting, setDetecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [descriptor, setDescriptor] = useState(null);

    // Fetch student name
    useEffect(() => {
        fetch(`/api/v1/students/${id}`)
            .then(r => r.json())
            .then(d => setStudent(d?.student || d))
            .catch(() => {});
    }, [id]);

    // Start camera IMMEDIATELY — don't wait for models
    useEffect(() => {
        let cancelled = false;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setCameraReady(true);
            })
            .catch(err => {
                if (!cancelled) toast.error("Camera error: " + err.message);
            });

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, []);

    // Load face-api models in parallel with the camera
    useEffect(() => {
        let cancelled = false;

        import("@vladmandic/face-api").then(async faceapi => {
            faceapiRef.current = faceapi;
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            if (!cancelled) setModelsReady(true);
        }).catch(err => {
            if (!cancelled) toast.error("AI model load failed: " + err.message);
        });

        return () => { cancelled = true; };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !faceapiRef.current) return;
        setDetecting(true);
        try {
            const det = await faceapiRef.current
                .detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!det) { toast.error("No face detected — align your face and retry."); return; }
            setDescriptor(Array.from(det.descriptor));
            setFaceDetected(true);
            toast.success("Face captured! Click Save.");
        } catch (err) {
            toast.error("Detection failed: " + err.message);
        } finally {
            setDetecting(false);
        }
    };

    const handleSave = async () => {
        if (!descriptor) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/users/${id}/face`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ descriptor }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            toast.success("Face biometrics enrolled!");
            router.push(`/admin/students/${id}`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const name = student?.profile
        ? `${student.profile.firstName} ${student.profile.lastName}`
        : "Student";

    const scanDisabled = !cameraReady || !modelsReady || detecting || saving;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-4 pt-8">
            <div className="w-full max-w-md mb-4">
                <button
                    onClick={() => router.push(`/admin/students/${id}`)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to {name}
                </button>
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4">
                    <h1 className="text-white text-lg font-bold">Enroll Face Biometrics</h1>
                    <p className="text-indigo-200 text-sm">{name}</p>
                </div>

                {/* Camera */}
                <div className="relative bg-black flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
                    {!cameraReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-10">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                            <p className="text-white text-sm">Starting camera…</p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay muted playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                    />

                    {/* Face guide oval */}
                    {cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="border-4 border-dashed rounded-full opacity-60" style={{
                                width: "55%", height: "75%",
                                borderColor: faceDetected ? "#10b981" : "#818cf8"
                            }} />
                        </div>
                    )}

                    {faceDetected && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                            <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={12} /> Face captured
                            </span>
                        </div>
                    )}
                </div>

                {/* Model loading status bar */}
                {!modelsReady && cameraReady && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-amber-500" />
                        <p className="text-xs text-amber-700">Loading AI face models… Scan Face will unlock shortly.</p>
                    </div>
                )}
                {modelsReady && (
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <p className="text-xs text-emerald-700">AI models ready — click Scan Face</p>
                    </div>
                )}

                {/* Buttons */}
                <div className="p-4 flex gap-3">
                    <button
                        type="button"
                        onClick={handleCapture}
                        disabled={scanDisabled}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {detecting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting…</>
                            : !modelsReady
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading AI…</>
                                : <><RefreshCw className="w-4 h-4" /> {faceDetected ? "Re-scan" : "Scan Face"}</>
                        }
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!faceDetected || saving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><CheckCircle2 className="w-4 h-4" /> Save Biometrics</>
                        }
                    </button>
                </div>

                <p className="text-center text-xs text-slate-400 pb-4">
                    Look directly at the camera · good lighting helps
                </p>
            </div>
        </div>
    );
}
