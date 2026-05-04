import { connectDB } from '@/lib/mongodb';
import Session from '@/models/Session';
import Institute from '@/models/Institute';
import mongoose from 'mongoose';

// PERFORMANCE OPTIMIZATION: Lightweight In-Memory Cache
const INSTITUTE_CACHE = new Map(); // instituteId -> { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * CRITICAL SECURITY MIDDLEWARE:
 * Validates and derives academic sessions server-side.
 */
export async function validateAndDeriveSession(req, scope) {
    try {
        if (!scope || !scope.instituteId) {
            throw new Error('Institute scope required for session validation');
        }

        await connectDB();

        const url = new URL(req.url);
        const clientProvidedSessionId = req.headers.get('x-session-id') || url.searchParams.get('session');
        const instituteId = scope.instituteId;

        // STEP 1: Validate institute exists and get its type (Cached)
        let institute;
        const cachedInst = INSTITUTE_CACHE.get(instituteId);
        const now = Date.now();

        if (cachedInst && (now - cachedInst.timestamp < CACHE_TTL)) {
            institute = cachedInst.data;
        } else {
            try {
                institute = await Institute.findById(instituteId).select('type code name');
                if (!institute) {
                    console.warn(`[SESSION_VALIDATION] Institute not found: ${instituteId}`);
                    throw new Error('Institute not found');
                }
                // Update cache
                INSTITUTE_CACHE.set(instituteId, { data: institute, timestamp: now });
            } catch (err) {
                console.error(`[SESSION_VALIDATION] Institute lookup failed:`, err.message);
                throw new Error('Invalid institute context');
            }
        }

        // STEP 2: For VOCATIONAL institutes, return null (no session filtering needed)
        if (institute.type === 'VOCATIONAL') {
            return {
                sessionId: null,
                session: null,
                instituteType: 'VOCATIONAL',
                instituteName: institute.name,
                reason: 'VOCATIONAL institutes do not use session isolation'
            };
        }

        // STEP 3: For SCHOOL institutes, validate/derive the session
        if (institute.type === 'SCHOOL') {
            // VALIDATION A: If client provided a session ID, validate it
            if (clientProvidedSessionId) {
                try {
                    const providedSession = await Session.findOne({
                        _id: new mongoose.Types.ObjectId(clientProvidedSessionId),
                        instituteId: new mongoose.Types.ObjectId(instituteId),
                        deletedAt: null
                    }).select('_id sessionName isActive startDate endDate');

                    if (!providedSession) {
                        console.warn(`[SESSION_VALIDATION] Client provided invalid/foreign session: ${clientProvidedSessionId} for institute ${instituteId}`);
                        // Don't trust client - fall through to derive current session
                    } else {
                        // Client session is valid for this institute
                        return {
                            sessionId: providedSession._id,
                            session: providedSession,
                            instituteType: 'SCHOOL',
                            instituteName: institute.name,
                            source: 'CLIENT_PROVIDED_AND_VALIDATED'
                        };
                    }
                } catch (err) {
                    console.warn(`[SESSION_VALIDATION] Error validating client session: ${err.message}`);
                    // Fall through to derive current session
                }
            }

            // VALIDATION B: Derive the CURRENT/ACTIVE session for this institute
            const currentDate = new Date();
            const currentSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(instituteId),
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate },
                isActive: true,
                deletedAt: null
            }).select('_id sessionName isActive startDate endDate').sort({ startDate: -1 });

            if (currentSession) {
                return {
                    sessionId: currentSession._id,
                    session: currentSession,
                    instituteType: 'SCHOOL',
                    instituteName: institute.name,
                    source: 'SERVER_DERIVED_CURRENT'
                };
            }

            // FALLBACK C: If no current session, use the most recent active session
            const mostRecentSession = await Session.findOne({
                instituteId: new mongoose.Types.ObjectId(instituteId),
                isActive: true,
                deletedAt: null
            }).select('_id sessionName isActive startDate endDate').sort({ startDate: -1 });

            if (mostRecentSession) {
                return {
                    sessionId: mostRecentSession._id,
                    session: mostRecentSession,
                    instituteType: 'SCHOOL',
                    instituteName: institute.name,
                    source: 'SERVER_DERIVED_MOSTRECENT'
                };
            }

            // No session found for SCHOOL institute - return null session (allows viewing all students across sessions)
            console.warn(`[SESSION_VALIDATION] No active session found for SCHOOL institute ${instituteId}, returning null session`);
            return {
                sessionId: null,
                session: null,
                instituteType: 'SCHOOL',
                instituteName: institute.name,
                source: 'NO_SESSION_AVAILABLE'
            };
        }

        // For non-SCHOOL institutes, return null session
        return {
            sessionId: null,
            session: null,
            instituteType: institute.type,
            instituteName: institute.name,
            source: 'NO_SESSION_NEEDED'
        };

    } catch (error) {
        console.error('[SESSION_VALIDATION] Fatal error:', error.message);
        throw error;
    }
}

/**
 * AUDIT LOGGING: Log every session access for security monitoring
 */
export async function logSessionAccess(userId, instituteId, sessionId, action = 'access') {
    try {
        await connectDB();
        const AuditLog = (await import('@/models/AuditLog')).default;
        
        await AuditLog.create({
            actor: userId,
            action: `session.${action}`,
            resource: { type: 'Session', id: sessionId },
            institute: instituteId,
            details: {
                timestamp: new Date(),
                accessedAt: new Date()
            }
        });
    } catch (err) {
        // Log but don't fail the request if audit fails
        console.error('[SESSION_AUDIT] Failed to log session access:', err.message);
    }
}

/**
 * VALIDATION HELPER: Verify session belongs to institute
 */
export async function verifySessionBelongsToInstitute(sessionId, instituteId) {
    try {
        await connectDB();
        
        const session = await Session.findOne({
            _id: new mongoose.Types.ObjectId(sessionId),
            instituteId: new mongoose.Types.ObjectId(instituteId),
            deletedAt: null
        });

        return session !== null;
    } catch (err) {
        console.error('[SESSION_VALIDATION] Verification failed:', err.message);
        return false;
    }
}

/**
 * SAFE CLEANUP: Remove all session references for a user on logout
 */
export function clearSessionFromClient() {
    // This function is called client-side after logout
    // to ensure localStorage doesn't leak session data
    if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedSession');
        sessionStorage.removeItem('selectedSession');
    }
}
