import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatLayout from "@/components/chat/ChatLayout";

export const metadata = {
    title: "Institute Chat | Admin",
    description: "Real-time communication with students and instructors",
};

export default async function AdminChatPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    // Double check role
    if (!["admin", "super_admin", "staff", "instructor"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            <ChatLayout currentUserId={session.user.id} />
        </div>
    );
}
