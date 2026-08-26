"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthBranding } from "@/components/auth/AuthBrandingContext";

function LoginForm() {
    const searchParams = useSearchParams();
    const instituteCode = searchParams.get("code");
    const { institute, setInstitute } = useAuthBranding();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // 1. If URL has ?code=..., lookup that institute immediately
    useEffect(() => {
        if (!instituteCode) return;
        let isMounted = true;
        async function fetchByCode() {
            try {
                const res = await fetch(`/api/v1/auth/lookup-institute?code=${encodeURIComponent(instituteCode)}`);
                const data = await res.json();
                if (isMounted && data.success && data.institute) {
                    setInstitute(data.institute);
                }
            } catch (err) {
                console.error("Code lookup error:", err);
            }
        }
        fetchByCode();
        return () => { isMounted = false; };
    }, [instituteCode, setInstitute]);

    // 2. Debounced email lookup as user types
    useEffect(() => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/auth/lookup-institute?email=${encodeURIComponent(trimmed)}`);
                const data = await res.json();
                if (isMounted && data.success) {
                    if (data.institute) {
                        setInstitute(data.institute);
                    }
                }
            } catch (err) {
                console.error("Email lookup error:", err);
            }
        }, 400);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [email, setInstitute]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                email,
                password,
                instituteCode: instituteCode || institute?.code || "",
                redirect: false,
            });

            if (!res) {
                setError("No response from authentication server");
                setLoading(false);
                return;
            }

            if (res.ok) {
                router.push("/dashboard");
                return;
            }

            if (res.error) {
                const displayError = (res.error === "undefined" || !res.error || res.error === "CredentialsSignin")
                    ? "Invalid email or password"
                    : res.error;

                setError(displayError);
                setLoading(false);
                return;
            }

            router.push("/dashboard");
        } catch (err) {
            console.error("Login Client Error:", err);
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="space-y-8">
                {/* Welcome Narrative */}
                <div className="space-y-2 text-center lg:text-left">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Welcome Back !
                    </h1>
                    <AnimatePresence mode="wait">
                        {institute ? (
                            <motion.p 
                                key={institute.code || institute.name}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="text-slate-500 font-medium text-sm md:text-base"
                            >
                                Please enter your credentials to access your portal.
                            </motion.p>
                        ) : (
                            <motion.p 
                                key="default-welcome"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="text-slate-500 font-medium text-sm md:text-base"
                            >
                                Please enter your details to continue.
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-5">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="admin@quantech.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="bg-white border-slate-200 focus:border-blue-500 focus:ring-0 transition-all rounded-xl py-4"
                        />

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="bg-white border-slate-200 focus:border-blue-500 focus:ring-0 transition-all rounded-xl py-4"
                                suffix={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                }
                            />
                            <div className="flex justify-end">
                                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-[11px] text-red-600 bg-red-50 p-4 rounded-xl border border-red-100/50 font-medium animate-fade-in text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <Button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] rounded-xl py-7"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span className="font-bold text-lg tracking-tight">Login</span>
                                    <LogIn size={20} />
                                </>
                            )}
                        </Button>

                        <div className="text-center text-xs font-medium text-slate-400">
                            By logging in, you agree to our{" "}
                            <button type="button" className="text-slate-600 font-bold hover:underline">Terms of Service</button>
                            {" "}and{" "}
                            <button type="button" className="text-slate-600 font-bold hover:underline">Privacy Policy</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-premium-blue" size={32} /></div>}>
            <LoginForm />
        </Suspense>
    );
}

