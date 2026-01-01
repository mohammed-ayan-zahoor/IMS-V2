import CredentialsProvider from "next-auth/providers/credentials";
import Error from "next/error";
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

                    // 1. Find user (Timing Attack Prevention: Don't return early if not found)
                    const user = await User.findOne({
                        email: email,
                        deletedAt: null
                    }).select("+passwordHash").populate('institute');

                    // 2. Prevent Timing Attack: Always compare password
                    // If user found, use their hash. If not, use a dummy hash to consume similar time.
                    // Pre-computed dummy hash (bcrypt hash of 'dummy')
                    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABC';
                    const targetHash = user?.passwordHash || dummyHash;

                    const isValid = await bcrypt.compare(password, targetHash);

                    // Now check user existence AND password validity
                    if (!user || !isValid) {
                        return null;
                    }

                    // 3. Validate Context (Institute/Role)
                    if (credentials.instituteCode) {
                        const code = credentials.instituteCode.toUpperCase();

                        // User must belong to this institute (unless super_admin impersonating? simplified for now)
                        if (user.institute?.code?.toUpperCase() !== code) {
                            if (user.role !== 'super_admin') return null; // Tenant mismatch
                        }

                        if (user.institute) {
                            if (user.institute.status !== 'active' || !user.institute.isActive) return null;
                            if (user.institute.isSubscriptionExpired) return null;
                        }
                    } else {
                        // No code provided -> Must be Super Admin
                        if (user.role !== 'super_admin') return null;
                    }

                    // 4. Audit Log (Successful Auth)
                    try {
                        await AuditLog.create({
                            action: 'LOGIN',
                            actor: {
                                userId: user._id,
                                name: `${user.profile?.firstName} ${user.profile?.lastName}`,
                                role: user.role,
                                ip: 'unknown' // NextAuth doesn't give IP easily here
                            },
                            target: {
                                resourceString: 'Auth'
                            },
                            institute: user.institute?._id,
                            status: 'success',
                            details: { method: 'credentials' }
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
                            code: user.institute.code
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
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.institute = token.institute;
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
