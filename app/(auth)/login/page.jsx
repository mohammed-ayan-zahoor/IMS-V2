"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { LogIn, ShieldCheck, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
                redirect: false,
            });

            if (!res) {
                setError("No response from authentication server");
                setLoading(false);
                return;
            }

            // If NextAuth says ok, we ignore the error string and proceed
            if (res.ok) {
                router.push("/dashboard");
                return;
            }

            if (res.error) {
                // Handle the case where error is the string "undefined" or null
                // Also handle "CredentialsSignin" which is the default NextAuth error for auth failure
                const displayError = (res.error === "undefined" || !res.error || res.error === "CredentialsSignin")
                    ? "Invalid email or password"
                    : res.error;

                setError(displayError);
                setLoading(false);
                return;
            }

            // Successful login - route based on session (middleware will handle this too)
            router.push("/dashboard");
        } catch (err) {
            console.error("Login Client Error:", err);
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="border-border shadow-sm bg-white overflow-visible">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-border">
                        <GraduationCap className="text-premium-blue" size={24} />
                    </div>
                </div>

                <CardHeader
                    title="IMS-v2"
                    subtitle="Enterprise Institute Management System"
                    className="text-center mb-10 pt-4"
                />

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="admin@ims.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />

                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 p-4 rounded-lg border border-red-100 font-medium animate-fade-in">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full flex items-center gap-2"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Secure Login</span>
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <ShieldCheck size={12} />
                            <span>Authorized Access</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <GraduationCap size={12} />
                            <span>Academic Portal</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
