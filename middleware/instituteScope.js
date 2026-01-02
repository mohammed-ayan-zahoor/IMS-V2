import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Middleware to enforce institute-level data isolation
 * Returns context: { user, instituteId, isSuperAdmin }
 */
import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

/**
 * Middleware to enforce institute-level data isolation
 * Returns context: { user, instituteId, isSuperAdmin }
 */
export async function getInstituteScope(req) {
    try {
        // DEBUG: Check if we are being called as a Mongoose hook (where req might be 'next' function)
        if (typeof req === 'function') {
            console.error("CRITICAL ERROR: getInstituteScope called as a function (likely Mongoose hook)!", new Error().stack);
            return null;
        }

        const session = await getServerSession(authOptions);

        if (!session) {
            return null; // Let caller handle unauthorized
        }

        const user = session.user;
        const isSuperAdmin = user.role === 'super_admin';

        // If Super Admin, they might be targeting a specific institute via query/header
        let instituteId = user.institute?.id;

        if (isSuperAdmin && req && req.url) {
            // Use dummy base for relative URLs
            const url = new URL(req.url, 'http://localhost');
            const queryId = url.searchParams.get('instituteId');

            // Validate format (Mongo ObjectId)
            if (queryId && /^[0-9a-fA-F]{24}$/.test(queryId)) {
                instituteId = queryId;

                // Audit Log for Impersonation/Override
                // We fire-and-forget this to avoid slowing down the read? 
                // Or await it for safety. User requested "add an audit log entry".
                // We must ensure DB is connected.
                try {
                    await connectDB();
                    await AuditLog.create({
                        actor: user.id,
                        action: 'super_admin.impersonate',
                        resource: { type: 'Institute', id: instituteId },
                        details: {
                            path: url.pathname,
                            method: req.method
                        },
                        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
                        userAgent: req.headers.get('user-agent') || 'unknown'
                    });
                } catch (logErr) {
                    console.error("Failed to audit super_admin impersonation:", logErr);
                    // Do not fail the request just because audit failed? 
                    // Strict security might say yes, but usually loose for logs.
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
