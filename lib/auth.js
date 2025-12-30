import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

console.log("=> Auth: Config Init - NEXTAUTH_SECRET is", process.env.NEXTAUTH_SECRET ? "DEFINED (len: " + process.env.NEXTAUTH_SECRET.length + ")" : "UNDEFINED");

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("=> Auth: Start authorize");
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password required");
                }

                try {
                    console.log("=> Auth: Connecting to DB");
                    await connectDB();

                    console.log("=> Auth: Finding user", credentials.email);
                    const user = await User.findOne({
                        email: credentials.email.toLowerCase(),
                        deletedAt: null,
                    }).select("+passwordHash");

                    if (!user) {
                        console.log("=> Auth: User not found");
                        return null;
                    }

                    console.log("=> Auth: Comparing password");
                    const isValid = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!isValid) {
                        console.log("=> Auth: Password invalid");
                        return null;
                    }

                    console.log("=> Auth: Updating last login");
                    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

                    const userObject = {
                        id: user._id.toString(),
                        email: user.email,
                        role: user.role,
                        name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
                        avatar: user.profile?.avatar || null,
                    };
                    console.log("=> Auth: Returning user object to NextAuth:", JSON.stringify(userObject));
                    return userObject;
                } catch (error) {
                    console.error("=> Auth: FATAL ERROR in authorize:", error);
                    return null;
                }
            },
        }),
    ],
    debug: true,
    logger: {
        error(code, metadata) {
            console.error("=> NextAuth Error:", code, metadata);
        },
        warn(code) {
            console.warn("=> NextAuth Warn:", code);
        },
        debug(code, metadata) {
            console.log("=> NextAuth Debug:", code, metadata);
        },
    },
    callbacks: {
        async jwt({ token, user, account, profile, trigger }) {
            console.log("=> Auth: JWT Callback Triggered", { hasUser: !!user, trigger });
            try {
                if (user) {
                    console.log("=> Auth: JWT Callback - Initializing token for", user.email);
                    token.role = user.role;
                    token.id = user.id;
                }
                return token;
            } catch (err) {
                console.error("=> Auth: JWT Callback ERROR:", err);
                return token;
            }
        },
        async session({ session, token }) {
            if (token) {
                console.log("=> Auth: Session Callback - Attaching role to session", token.role);
                session.user.role = token.role;
                session.user.id = token.id;
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
