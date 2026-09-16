import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Checks session and verifies whether user has permission to manage stock.
 * Authorized roles: admin, super_admin, or staff/instructor with 'manage_stock' permission.
 */
export async function getStockAuth(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { authorized: false, error: "Unauthorized", status: 401 };
    }

    const instituteId = session.user.institute?.id;
    if (!instituteId) {
        return { authorized: false, error: "Institute not found", status: 400 };
    }

    const role = session.user.role;
    const permissions = session.user.permissions || [];
    const isAllowed = ['admin', 'super_admin'].includes(role) ||
        (['staff', 'instructor'].includes(role) && permissions.includes('manage_stock'));

    if (!isAllowed) {
        return { authorized: false, error: "Forbidden: Stock management permission required", status: 403 };
    }

    return {
        authorized: true,
        session,
        instituteId,
        userId: session.user.id
    };
}
