import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Direct dashboard access
        if (path === "/dashboard") {
            if (token?.role === "student") {
                return NextResponse.redirect(new URL("/student/dashboard", req.url));
            }
            return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        }

        // Protection for admin routes
        if (path.startsWith("/admin") && token?.role !== "admin" && token?.role !== "super_admin") {
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
        "/dashboard/:path*",
        "/admin/:path*",
        "/student/:path*",
        "/dashboard"
    ],
};
