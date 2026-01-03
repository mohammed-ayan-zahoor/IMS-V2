"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SuperAdminLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/dashboard"); // Redirect unauthorized users
        }
    }, [status, session, router]);

    if (status === "loading") {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (session?.user?.role !== "super_admin") {
        return null;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className={`bg-gray-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    {isSidebarOpen && <h1 className="text-xl font-bold">Super Admin</h1>}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-gray-800">
                        {isSidebarOpen ? '«' : '»'}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink href="/super-admin" icon="📊" label="Dashboard" isOpen={isSidebarOpen} />
                    <NavLink href="/super-admin/institutes" icon="🏢" label="Institutes" isOpen={isSidebarOpen} />
                    <NavLink href="/super-admin/settings" icon="⚙️" label="Global Settings" isOpen={isSidebarOpen} />
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            {session.user.name?.[0] || session.user.email?.[0] || 'SA'}
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{session.user.name || session.user.email || 'Super Admin'}</p>
                                <p className="text-xs text-gray-400 truncate">Super Admin</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={async () => {
                            await signOut({ redirect: false });
                            window.location.href = "/login";
                        }}
                        className={`flex items-center gap-3 w-full p-2 rounded hover:bg-red-500/10 text-red-400 hover:text-red-400 transition-colors ${!isSidebarOpen && 'justify-center'}`}
                        title="Sign Out"
                    >
                        <span className="text-xl">🚪</span>
                        {isSidebarOpen && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-gray-800">IMS Platform Manager</h2>
                    <div className="flex gap-4">
                        <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">Go to App</Link>
                    </div>
                </header>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, icon, label, isOpen }) {
    return (
        <Link href={href} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
            <span className="text-xl">{icon}</span>
            {isOpen && <span>{label}</span>}
        </Link>
    )
}
