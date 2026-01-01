/**
 * Safely extracts the client IP address from the request.
 * Checks trusted proxies before trusting x-forwarded-for.
 * @param {Request} req 
 * @returns {string} IP address or 'unknown'
 */
export function getClientIp(req) {
    const trustedProxies = (process.env.TRUSTED_PROXIES || "")
        .split(",")
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);
    // In strict environments, we might check req.ip (if defined by Next.js/Platform)
    const xForwardedFor = req.headers["x-forwarded-for"] || req.headers.get?.("x-forwarded-for");
    const remoteAddress = req.socket?.remoteAddress || req.ip;

    if (xForwardedFor) {
        const ips = xForwardedFor.split(",").map(ip => ip.trim());
        const clientIp = ips[0];

        // Normalize IP helper
        const normalizeIp = (ip) => {
            if (!ip) return '';
            let normalized = ip.trim();

            // Remove IPv6 zone identifier
            if (normalized.includes('%')) normalized = normalized.split('%')[0];

            // Strip brackets (with or without port)
            if (normalized.startsWith('[')) {
                // Handle [IPv6]:port or [IPv6]
                const bracketEnd = normalized.indexOf(']');
                if (bracketEnd !== -1) {
                    normalized = normalized.substring(1, bracketEnd);
                }
            }

            // Handle IPv4-mapped IPv6 BEFORE port stripping
            if (normalized.startsWith('::ffff:')) {
                normalized = normalized.replace('::ffff:', '');
            }

            // Remove port from IPv4:port (only if it looks like IPv4)
            if (normalized.includes('.') && normalized.includes(':')) {
                const lastColon = normalized.lastIndexOf(':');
                const afterColon = normalized.substring(lastColon + 1);
                // Check if after last colon is a number (port)
                if (/^\d+$/.test(afterColon)) {
                    normalized = normalized.substring(0, lastColon);
                }
            }

            return normalized;
        };
        const normalizedRemote = normalizeIp(remoteAddress);
        // Filter out empty strings to avoid accidental matches
        const trustedSet = new Set(trustedProxies.map(normalizeIp).filter(ip => ip));

        // Only trust x-forwarded-for if proxies are configured AND request came from one
        if (trustedSet.size > 0 && normalizedRemote && trustedSet.has(normalizedRemote)) {
            if (isValidIp(clientIp)) return clientIp;
        }
        // If no proxies configured or request didn't come from a trusted one,
        // we ignore x-forwarded-for (it could be spoofed).
    }
    if (isValidIp(remoteAddress)) return remoteAddress;

    return "unknown";
}

function isValidIp(ip) {
    if (!ip) return false;
    // Simple but more robust regex for v4 and v6
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
