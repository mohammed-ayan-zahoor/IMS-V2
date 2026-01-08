import CredentialsProvider from "next-auth/providers/credentials";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import bcrypt from "bcryptjs";
import AuditLog from "@/models/AuditLog";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                instituteCode: { label: "Institute Code", type: "text" }
            },
            async authorize(credentials) {
                if (process.env.NODE_ENV === 'development') {
                    console.log("=> Auth: Start authorize", { hasCode: !!credentials?.instituteCode });
                }

                const email = credentials?.email?.toLowerCase() || '';
                const password = credentials?.password || '';

                if (!email || !password) {
                    return null;
                }

                try {
                    await connectDB();

                    // 1. Find potential users (Timing Attack Prevention implicit by checking filtered results later)
                    let users = await User.find({
                        email: email,
                        deletedAt: null
                    }).select("+passwordHash").populate({
                        path: 'institute',
                        select: 'name code branding address status isActive'
                    });

                    let user = null;

                    // Strategy: Filter potentially valid users
                    if (credentials.instituteCode) {
                        // Strict mode: User must belong to this specific institute code
                        const targetCode = credentials.instituteCode.toUpperCase();
                        user = users.find(u => u.institute && u.institute.code === targetCode);

                        // If not found by code, we leave user as null. 
                    } else {
                        // Ambiguous mode (Email/Password only): Prefer "Active" Institute
                        // Priority 1: Super Admin
                        // Priority 2: Admin/Student of an Active Institute

                        const superAdmin = users.find(u => u.role === 'super_admin');
                        if (superAdmin) {
                            user = superAdmin;
                        } else {
                            // Find user belonging to an active institute
                            const activeUser = users.find(u =>
                                u.institute &&
                                u.institute.status === 'active' &&
                                u.institute.isActive &&
                                !u.institute.deletedAt // Redundant if deletedAt checked on fetch, but safe
                            );

                            user = activeUser;
                            // If no active user found, we fail safe
                        }
                    }

                    // 2. Prevent Timing Attack: Always compare password
                    // If user found, use their hash. If not, use a dummy hash to consume similar time.
                    // Pre-computed dummy hash (valid bcrypt hash of 'dummy_password')
                    // Generated via: bcrypt.hashSync('dummy_password', 10)
                    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

                    const targetHash = user?.passwordHash || dummyHash;

                    const isValid = await bcrypt.compare(password, targetHash);
                    // console.log(`=> Auth Debug: Password Valid? ${isValid}. HashExists? ${!!user?.passwordHash}`);
                    // Now check user existence AND password validity
                    if (!user || !isValid) {
                        return null;
                    }

                    // 3. Validate Context (Institute/Role)
                    if (credentials.instituteCode) {
                        const code = credentials.instituteCode.toUpperCase();

                        // User must belong to this institute (unless super_admin impersonating)
                        if (user.institute?.code?.toUpperCase() !== code) {
                            if (user.role !== 'super_admin') return null; // Tenant mismatch
                        }
                    }

                    // For all users with an institute (whether code was provided or auto-selected), validate institute status
                    if (user.institute) {
                        if (user.institute.status !== 'active' || !user.institute.isActive) return null;
                        if (user.institute.isSubscriptionExpired) return null;
                    } else {
                        // User has no institute -> Must be Super Admin
                        if (user.role !== 'super_admin') return null;
                    }

                    // 4. Audit Log (Successful Auth)
                    try {
                        await AuditLog.create({
                            action: 'user.login',
                            actor: user._id,
                            target: {
                                resourceString: 'Auth'
                            },
                            institute: user.institute?._id,
                            status: 'success',
                            details: {
                                method: 'credentials',
                                actorSnapshot: {
                                    name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
                                    role: user.role,
                                    ip: 'unknown'
                                }
                            }
                        });
                    } catch (auditErr) {
                        console.error("=> Auth: Failed to create audit log:", auditErr);
                        // Do not fail request
                    }

                    // 5. Update Last Login (Async/Safe)
                    try {
                        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
                    } catch (err) {
                        console.error("=> Auth: Failed to update lastLogin:", err.message);
                    }

                    const userObject = {
                        id: user._id.toString(),
                        email: user.email,
                        role: user.role,
                        name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
                        avatar: user.profile?.avatar || null,
                        institute: user.institute ? {
                            id: user.institute._id.toString(),
                            name: user.institute.name,
                            code: user.institute.code,
                            logo: user.institute.branding?.logo || null
                        } : null
                    };

                    return userObject;

                } catch (error) {
                    console.error("=> Auth: FATAL ERROR in authorize:", error);
                    return null;
                }
            },
        }),
    ],
    debug: process.env.NODE_ENV === 'development', callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.institute = user.institute;
                token.picture = user.avatar; // Use standard 'picture' claim or custom 'avatar'
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.institute = token.institute;
                session.user.image = token.picture; // Map to standard next-auth 'image'
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
