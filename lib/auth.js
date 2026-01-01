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

                if (!credentials?.email || !credentials?.password) {
                    // Return null indicates failed auth
                    return null;
                }

                try {
                    await connectDB();

                    // 1. Always find user by email first (Timing Attack Prevention)
                    const user = await User.findOne({
                        email: credentials.email.toLowerCase(),
                        deletedAt: null
                    }).select("+passwordHash").populate('institute');

                    if (!user) {
                        // Don't reveal user doesn't exist
                        return null;
                    }

                    // 2. Verify Password BEFORE checking context
                    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
                    if (!isValid) {
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
