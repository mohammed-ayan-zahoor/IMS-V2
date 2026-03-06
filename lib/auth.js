import CredentialsProvider from "next-auth/providers/credentials";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Membership from "@/models/Membership";
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

                    // 1. Find the User globally by email
                    const user = await User.findOne({
                        email: email,
                        deletedAt: null
                    }).select("+passwordHash");

                    // 2. Prevent Timing Attack: Always compare password
                    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
                    const targetHash = user?.passwordHash || dummyHash;
                    const isValid = await bcrypt.compare(password, targetHash);

                    if (!user || !isValid) {
                        return null;
                    }

                    // 3. Find All Memberships for this user
                    // Populate institute details for the session
                    const memberships = await Membership.find({
                        user: user._id,
                        isActive: true
                    }).populate({
                        path: 'institute',
                        select: 'name code branding status isActive subscription'
                    });

                    let activeMembership = null;

                    if (credentials.instituteCode) {
                        const targetCode = credentials.instituteCode.toUpperCase();
                        activeMembership = memberships.find(m => m.institute && m.institute.code === targetCode);

                        // If specifically requested a code but have no membership, fail
                        if (!activeMembership && user.role !== 'super_admin') return null;
                    }

                    // If NO specific code or requested code not in memberships (fallback for super admin)
                    if (!activeMembership) {
                        if (user.role === 'super_admin') {
                            // Super Admin can land without a specific institute or on any active one
                            const activeInst = memberships[0]?.institute || await Institute.findOne({ status: 'active', isActive: true });
                            activeMembership = { institute: activeInst, role: 'super_admin' };
                        } else {
                            // Regular User: Land on first membership or fail
                            activeMembership = memberships[0];
                        }
                    }

                    if (!activeMembership && user.role !== 'super_admin') {
                        return null; // No accessible institutes
                    }

                    const activeInstitute = activeMembership?.institute;

                    // 4. Validate active institute status
                    if (activeInstitute) {
                        if (activeInstitute.status !== 'active' || !activeInstitute.isActive) return null;
                        // check subscription expired check if using the model method or checking manually
                        // activeInstitute is a mongoose object from populate
                        if (activeInstitute.subscription?.endDate && new Date() > activeInstitute.subscription.endDate) return null;
                    }

                    // 3. Validate Context (Removed redundant tenant mismatch check, handled by membership search)

                    // 5. Audit Log (Successful Auth)
                    try {
                        await AuditLog.create({
                            action: 'user.login',
                            actor: user._id,
                            target: {
                                resourceString: 'Auth'
                            },
                            institute: activeInstitute?._id,
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
                        role: activeMembership?.role || user.role, // Use membership role if available
                        name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
                        avatar: user.profile?.avatar || null,
                        institute: activeInstitute ? {
                            id: activeInstitute._id.toString(),
                            name: activeInstitute.name,
                            code: activeInstitute.code,
                            logo: activeInstitute.branding?.logo || null
                        } : null,
                        availableInstitutes: memberships
                            .filter(m => m.institute && m.institute._id)
                            .map(m => ({
                                id: m.institute._id.toString(),
                                name: m.institute.name,
                                code: m.institute.code,
                                role: m.role
                            }))
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
        async jwt({ token, user, trigger, session }) {
            if (process.env.NODE_ENV === 'development') {
                console.log("=> Auth JWT Call:", { trigger, hasUser: !!user, hasTokenInst: !!token.institute });
            }

            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.institute = user.institute;
                token.availableInstitutes = user.availableInstitutes;
                token.picture = user.avatar;
            }

            // Handle manual session update (Switch Institute)
            if (trigger === "update" && session?.activeInstitute) {
                if (process.env.NODE_ENV === 'development') {
                    console.log("=> Auth JWT Update Triggered:", { targetId: session.activeInstitute.id });
                }

                const targetInstId = session.activeInstitute.id;
                // Verify the user actually has membership for this institute
                const verifiedMembership = token.availableInstitutes?.find(m => m.id === targetInstId);

                if (verifiedMembership) {
                    token.institute = session.activeInstitute;
                    token.role = verifiedMembership.role; // Use role from the verified membership
                } else if (token.role === 'super_admin') {
                    // Super Admin can switch anywhere
                    token.institute = session.activeInstitute;
                    const VALID_ROLES = ['super_admin', 'admin', 'teacher', 'student', 'member'];

                } else if (token.role === 'super_admin') {
                    token.institute = session.activeInstitute;
                    if (session.activeRole && VALID_ROLES.includes(session.activeRole)) {
                        token.role = session.activeRole;
                    }
                }
            }
        }

            return token;
    },
    async session({ session, token }) {
        if (token) {
            session.user.role = token.role;
            session.user.id = token.id;
            session.user.institute = token.institute;
            session.user.availableInstitutes = token.availableInstitutes;
            session.user.image = token.picture;
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
