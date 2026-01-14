import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Direct dashboard or root access
        if (path === "/dashboard" || path === "/") {
            if (token?.role === "student") {
                return NextResponse.redirect(new URL("/student/dashboard", req.url));
            }
            if (token?.role === "admin" || token?.role === "super_admin") {
                return NextResponse.redirect(new URL("/admin/dashboard", req.url));
            }
            if (token?.role === "instructor") {
                return NextResponse.redirect(new URL("/instructor/dashboard", req.url));
            }
            // If at root and no token, allow client-side handling or redirect to login
            if (path === "/") return NextResponse.redirect(new URL("/login", req.url));
        }

        // Helper to force redirect admin -> instructor path for consistency
        if (path.startsWith("/admin") && token?.role === "instructor") {
            return NextResponse.redirect(new URL(path.replace("/admin", "/instructor"), req.url));
        }

        // Protection for admin & instructor routes
        // Check if path is admin OR instructor
        const isAdminPath = path.startsWith("/admin");
        const isInstructorPath = path.startsWith("/instructor");

        if ((isAdminPath || isInstructorPath) && token?.role !== "admin" && token?.role !== "super_admin" && token?.role !== "instructor") {
            if (token?.role === "student") {
                return NextResponse.redirect(new URL("/student/dashboard", req.url));
            }
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }

        // Protection for student routes
        if (path.startsWith("/student") && token?.role !== "student") {
            if (token?.role === "admin" || token?.role === "super_admin") {
                return NextResponse.redirect(new URL("/admin/dashboard", req.url));
            }
            return NextResponse.redirect(new URL("/unauthorized", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/",
        "/dashboard/:path*",
        "/admin/:path*",
        "/student/:path*",
        "/dashboard"
    ],
};
