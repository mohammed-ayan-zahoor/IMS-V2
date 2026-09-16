import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatLayout from "@/components/chat/ChatLayout";

export const metadata = {
    title: "My Messages | Student",
    description: "Real-time communication with institute staff",
};

export default async function StudentChatPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    if (session.user.role !== "student") {
        redirect("/");
    }

    return (
        <div className="h-full w-full flex-1 flex flex-col min-h-0 overflow-hidden">
            <ChatLayout currentUserId={session.user.id} />
        </div>
    );
}
