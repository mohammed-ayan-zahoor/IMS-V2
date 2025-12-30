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

            if (res.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            // Successful login - route based on session (middleware will handle this too)
            router.push("/dashboard");
        } catch (err) {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 p-4">
                    <div className="w-12 h-12 bg-premium-blue/10 rounded-full flex items-center justify-center border border-premium-blue/20">
                        <ShieldCheck className="text-premium-blue" size={24} />
                    </div>
                </div>

                <CardHeader
                    title="IMS-v2"
                    subtitle="Enterprise Institute Management System"
                    className="text-center mb-8"
                />

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                            <p className="text-xs text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
                                {error}
                            </p>
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

                    <div className="mt-8 pt-6 border-t border-glass-border flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-foreground/40">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck size={12} />
                            <span>Admin Access</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <GraduationCap size={12} />
                            <span>Student Portal</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
