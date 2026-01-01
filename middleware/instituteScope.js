import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Middleware to enforce institute-level data isolation
 * Returns context: { user, instituteId, isSuperAdmin }
 */
export async function getInstituteScope(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return null; // Let caller handle unauthorized
    }

    const user = session.user;
    const isSuperAdmin = user.role === 'super_admin';

    // If Super Admin, they might be targeting a specific institute via query/header,
    // OR defaulting to their own context (which might be null or a management institute).
    // For now, if super admin, we check if they passed 'instituteId' query param to impersonate/manage.
    let instituteId = user.institute?.id;

    if (isSuperAdmin) {
        // Logic for Super Admin to switch context could go here.
        // For now, they also belong to an institute (Default most likely).
    }

    return {
        user: session.user,
        instituteId: instituteId,
        isSuperAdmin: isSuperAdmin
    };
}

/**
 * Add institute filter to query
 */
export function addInstituteFilter(filter, scope) {
    if (!scope || !scope.instituteId) {
        if (scope?.isSuperAdmin) return filter;
        throw new Error("Institute Context Missing");
    }

    // Default to empty object if filter is invalid to prevent spread errors
    const safeFilter = (filter && typeof filter === 'object') ? filter : {};

    return {
        ...safeFilter,
        institute: scope.instituteId
    };
}
/**
 * Validate user can access resource from their institute
 */
export function validateInstituteAccess(resource, scope) {
    if (!resource) {
        // Fail closed: If resource is missing/null, deny access by default.
        return false;
    }
    if (!scope) return false;

    if (scope.isSuperAdmin) {
        return true;
    }

    if (!resource.institute) {
        // Resource has no institute (legacy?), deny access to safe
        console.warn("Access denied: Resource has no institute", resource._id);
        return false;
    }

    const resourceInstituteId = String(resource.institute);
    const scopeInstituteId = String(scope.instituteId);

    if (resourceInstituteId !== scopeInstituteId) {
        console.warn(`Access denied: Tenant Mismatch. User: ${scopeInstituteId}, Resource: ${resourceInstituteId}`);
        return false;
    }

    return true;
}
