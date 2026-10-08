"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Loader2, Eye, EyeOff, CheckCircle2, Building2 } from "lucide-react";
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
    const [searchingInstitute, setSearchingInstitute] = useState(false);
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

    // 2. Debounced email lookup as user types with live micro-indicator
    useEffect(() => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
            setSearchingInstitute(false);
            return;
        }

        let isMounted = true;
        setSearchingInstitute(true);
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
            } finally {
                if (isMounted) setSearchingInstitute(false);
            }
        }, 350);

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
            <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-7"
            >
                {/* Welcome Narrative */}
                <div className="space-y-1.5 text-center lg:text-left">
                    <h1 className="text-3xl md:text-[32px] font-black text-slate-900 tracking-[-0.03em] leading-tight">
                        {institute?.name ? `Welcome to ${institute.name}` : "Welcome Back"}
                    </h1>
                    <p className="text-slate-500 font-normal text-sm md:text-base tracking-[-0.01em]">
                        {institute ? "Enter your credentials to access your institute portal." : "Please enter your details to continue to your workspace."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        {/* Email Field with Interactive Micro-Animations */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                                    Email Address
                                </label>
                                <AnimatePresence>
                                    {institute && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8, x: 6 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.8, x: 6 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full"
                                        >
                                            <CheckCircle2 size={11} className="text-emerald-500" />
                                            <span>Institute Detected</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="name@institute.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/90 focus:border-blue-500 rounded-xl px-4 py-3.5 pr-10 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                                />
                                
                                {/* Micro-spinner / status indicator for email domain lookup */}
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {searchingInstitute ? (
                                            <motion.div
                                                key="searching"
                                                initial={{ opacity: 0, scale: 0.6 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.6 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <Loader2 size={16} className="text-blue-500 animate-spin" />
                                            </motion.div>
                                        ) : institute ? (
                                            <motion.div
                                                key="found"
                                                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                            >
                                                <Building2 size={16} className="text-emerald-500" />
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Password Field with Morphing Eye Toggle */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                                    Password
                                </label>
                                <button 
                                    type="button" 
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/90 focus:border-blue-500 rounded-xl px-4 py-3.5 pr-11 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                                />
                                
                                {/* Micro-animated Eye Toggle */}
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 active:text-blue-600 rounded-lg hover:bg-slate-100/80 transition-colors cursor-pointer"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.span
                                            key={showPassword ? "eye-off" : "eye-on"}
                                            initial={{ opacity: 0, scale: 0.5, rotate: showPassword ? 35 : -35 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: showPassword ? -35 : 35 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                            className="flex items-center justify-center"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </motion.span>
                                    </AnimatePresence>
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-xs text-rose-700 bg-rose-50/80 border border-rose-200/70 p-3.5 rounded-xl font-medium text-center shadow-sm"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-5 pt-2">
                        <motion.button
                            type="submit"
                            whileTap={{ scale: 0.985 }}
                            whileHover={{ translateY: -1 }}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm md:text-base py-3.5 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <LogIn size={18} />
                                </>
                            )}
                        </motion.button>

                        <div className="text-center text-[11px] font-medium text-slate-400">
                            By signing in, you agree to our{" "}
                            <button type="button" className="text-slate-600 font-semibold hover:underline">Terms</button>
                            {" "}and{" "}
                            <button type="button" className="text-slate-600 font-semibold hover:underline">Privacy Policy</button>
                        </div>
                    </div>
                </form>
            </motion.div>
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

