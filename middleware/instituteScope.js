import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Middleware to enforce institute-level data isolation
 * Returns context: { user, instituteId, isSuperAdmin }
 */
export async function getInstituteScope(req) {
    try {
        // DEBUG: Check if we are being called as a Mongoose hook (where req might be 'next' function)
        if (typeof req === 'function') {
            console.error("CRITICAL ERROR: getInstituteScope called as a function (likely Mongoose hook)!", new Error().stack);
            // If it's next(), calling it might save us? But better to return null or throw distinct error.
            return null;
        }

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
            // Check query param or header for impersonation context
            // Ensure req is valid object before accessing url
            if (req && req.url) {
                const queryId = new URL(req.url).searchParams.get('instituteId');
                if (queryId) {
                    instituteId = queryId;
                }
            }
        }

        return {
            user: session.user,
            instituteId: instituteId,
            isSuperAdmin: isSuperAdmin
        };
    } catch (err) {
        console.error("ERROR in getInstituteScope:", err);
        throw err; // Re-throw to see 500
    }
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
export async function validateInstituteAccess(resource, scope) {
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
