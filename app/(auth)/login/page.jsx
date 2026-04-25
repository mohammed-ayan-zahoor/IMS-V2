"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { LogIn, ShieldCheck, GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

function LoginForm() {
    const searchParams = useSearchParams();
    const instituteCode = searchParams.get("code");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                email,
                password,
                instituteCode: instituteCode || "",
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
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="backdrop-blur-md bg-white/95 border-white/40 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] overflow-visible rounded-[2rem] md:rounded-[2.5rem] px-5 py-8 md:p-10">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl border border-slate-50">
                        <GraduationCap className="text-blue-600" size={26} />
                    </div>
                </div>

                <CardHeader
                    title="Eduvanta"
                    subtitle="Enterprise Institute Management System"
                    className="text-center mb-6 md:mb-8 pt-4 md:pt-8"
                />

                <CardContent className="space-y-6 md:space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                        <div className="space-y-5">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="admin@eduvanta.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />

                            <Input
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
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
                        </div>

                        {error && (
                            <div className="text-[11px] text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100/50 font-medium animate-fade-in text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <Button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] rounded-2xl py-7"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        <span className="font-bold text-lg tracking-tight">Access Dashboard</span>
                                    </>
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-blue-500" />
                                    <span>Encrypted</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-cyan-500" />
                                    <span>Protected</span>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="pt-6 border-t border-slate-100 flex justify-center items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-300">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <GraduationCap size={12} />
                            <span>Institutional Portal</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-premium-blue" size={32} /></div>}>
            <LoginForm />
        </Suspense>
    );
}
