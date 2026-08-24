// lib/dashboardCache.js
// Shared in-memory cache for dashboard stats across API routes

export const statsCache = new Map();

// Helper function to clear cache for an institute
export function clearDashboardCache(instituteId = null) {
    if (instituteId) {
        const prefix = `stats_${instituteId}`;
        for (const key of statsCache.keys()) {
            if (key.startsWith(prefix)) {
                statsCache.delete(key);
            }
        }
    } else {
        // Clear all cache
        statsCache.clear();
    }
}
