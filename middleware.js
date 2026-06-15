import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

/**
 * Extracts the subdomain from a hostname.
 * e.g. "stanns.imsportal.3ftech.in" → "stanns"
 * Returns null if the request is from the root domain itself.
 */
function extractSubdomain(hostname) {
    // Strip port for local development (e.g. localhost:3000)
    const host = hostname.split(':')[0];
    const rootHost = ROOT_DOMAIN.split(':')[0];

    if (host === rootHost || !host.endsWith(`.${rootHost}`)) {
        return null;
    }

    // Extract the part before the first dot of the root domain
    return host.slice(0, host.length - rootHost.length - 1);
}

function extractCustomDomain(hostname) {
    const host = hostname.split(':')[0];
    const rootHost = ROOT_DOMAIN.split(':')[0];

    // If it's the root host or a subdomain of the root host, it's not a custom domain.
    if (host === rootHost || host.endsWith(`.${rootHost}`) || host === '127.0.0.1' || host === 'localhost') {
        return null;
    }

    return host;
}

export default async function middleware(req) {
    const hostname = req.headers.get('host') || '';
    const subdomain = extractSubdomain(hostname);
    const customDomain = extractCustomDomain(hostname);

    const path = req.nextUrl.pathname;

    // ── 1. Custom Domain Routing ────────────────────────────────────────────────
    if (customDomain) {
        if (
            !path.startsWith('/api/') &&
            !path.startsWith('/_next/') &&
            !path.startsWith('/favicon') &&
            !path.startsWith('/service-worker')
        ) {
            const rewriteUrl = new URL(`/website/domain/${customDomain}${path === '/' ? '' : path}`, req.url);
            return NextResponse.rewrite(rewriteUrl);
        }
        return NextResponse.next();
    }

    // ── 2. Subdomain Routing ────────────────────────────────────────────────────
    if (subdomain) {

        // Only rewrite root and non-API paths to the public website
        // Pass through API routes, Next.js internals, and static files unchanged
        if (
            !path.startsWith('/api/') &&
            !path.startsWith('/_next/') &&
            !path.startsWith('/favicon') &&
            !path.startsWith('/service-worker')
        ) {
            const rewriteUrl = new URL(`/website/${subdomain}${path === '/' ? '' : path}`, req.url);
            return NextResponse.rewrite(rewriteUrl);
        }

        // API calls from school sites (e.g. /api/v1/website/leads) — allow passthrough
        return NextResponse.next();
    }

    // ── Normal domain → Existing auth-protected middleware ──────────────────
    const requiresAuth =
        path === "/" ||
        path === "/dashboard" || path.startsWith("/dashboard/") ||
        path === "/admin" || path.startsWith("/admin/") ||
        path === "/student" || path.startsWith("/student/") ||
        path === "/instructor" || path.startsWith("/instructor/");

    if (!requiresAuth) {
        return NextResponse.next();
    }

    return withAuth(
        function authMiddleware(req) {
            const token = req.nextauth.token;
            const path = req.nextUrl.pathname;

            // Redirect root / and /dashboard based on role
            if (path === "/dashboard" || path === "/") {
                if (token?.role === "student") {
                    return NextResponse.redirect(new URL("/student/dashboard", req.url));
                }
                if (["admin", "super_admin", "instructor"].includes(token?.role)) {
                    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
                }
                if (path === "/") return NextResponse.redirect(new URL("/login", req.url));
            }

            // Protect admin & instructor routes
            const isAdminPath = path.startsWith("/admin");
            const isInstructorPath = path.startsWith("/instructor");

            if ((isAdminPath || isInstructorPath) &&
                !["admin", "super_admin", "instructor"].includes(token?.role)) {
                if (token?.role === "student") {
                    return NextResponse.redirect(new URL("/student/dashboard", req.url));
                }
                return NextResponse.redirect(new URL("/unauthorized", req.url));
            }

            // Protect student routes
            if (path.startsWith("/student") && token?.role !== "student") {
                if (["admin", "super_admin"].includes(token?.role)) {
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
    )(req);
}

export const config = {
    matcher: [
        /*
         * Match all paths EXCEPT:
         * - /website/* (public school pages accessed via path-based routing)
         * - /api/v1/website/* (public website APIs — leads, notices, etc.)
         * - Static Next.js files
         */
        '/((?!website|_next/static|_next/image|favicon.ico|service-worker.js).*)',
    ],
};
