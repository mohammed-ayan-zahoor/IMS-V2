import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import bcrypt from "bcryptjs";

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
                    throw new Error("Email and password required");
                }

                try {
                    if (process.env.NODE_ENV === 'development') console.log("=> Auth: Connecting to DB");
                    await connectDB();

                    let user;
                    let institute = null;

                    // 1. Check for Super Admin (Global)
                    if (!credentials.instituteCode) {
                        if (process.env.NODE_ENV === 'development') console.log("=> Auth: Checking for Super Admin");
                        user = await User.findOne({
                            email: credentials.email.toLowerCase(),
                            role: 'super_admin',
                            deletedAt: null
                        }).select("+passwordHash").populate('institute');

                        if (!user) {
                            throw new Error("Institute Code is required for non-super admins");
                        }
                    } else {
                        // 2. Validate Institute
                        if (process.env.NODE_ENV === 'development') console.log("=> Auth: Finding Institute");
                        institute = await Institute.findOne({
                            code: credentials.instituteCode.toUpperCase(),
                            status: 'active',
                            isActive: true
                        });

                        if (!institute) {
                            throw new Error("Invalid Institute Code");
                        }

                        if (institute.isSubscriptionExpired) {
                            throw new Error("Institute Subscription Expired");
                        }

                        // 3. Find User IN THAT Institute
                        if (process.env.NODE_ENV === 'development') console.log("=> Auth: Finding User in Institute");
                        user = await User.findOne({
                            email: credentials.email.toLowerCase(),
                            institute: institute._id,
                            deletedAt: null,
                        }).select("+passwordHash").populate('institute');
                    }

                    if (!user) {
                        if (process.env.NODE_ENV === 'development') console.log("=> Auth: User not found");
                        return null;
                    }

                    if (process.env.NODE_ENV === 'development') console.log("=> Auth: Comparing password");
                    const isValid = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!isValid) {
                        if (process.env.NODE_ENV === 'development') console.log("=> Auth: Password invalid");
                        return null;
                    }

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

                    if (process.env.NODE_ENV === 'development') console.log("=> Auth: Returned User");
                    return userObject;
                } catch (error) {
                    console.error("=> Auth: FATAL ERROR in authorize:", error.message);
                    // Return generic error to client
                    throw new Error("Authentication failed");
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
