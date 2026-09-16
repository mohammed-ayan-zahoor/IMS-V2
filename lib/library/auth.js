import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';

/**
 * Returns { session, instituteId, userId } or throws a Response-ready error object.
 * Usage:
 *   const { session, instituteId, userId } = await getLibraryAuth();
 */
export async function getLibraryAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw { status: 401, message: 'Unauthorized' };

    const instituteId = session.user.institute?.id || session.user.instituteId || (typeof session.user.institute === 'string' ? session.user.institute : null);
    if (!instituteId) throw { status: 400, message: 'Institute not found in session' };

    const { role, permissions } = session.user;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const hasPermission = permissions?.includes('manage_library');

    if (!isAdmin && !hasPermission) throw { status: 403, message: 'Forbidden: Library access required' };

    await connectDB();
    return { session, instituteId: instituteId.toString(), userId: session.user.id };
}
