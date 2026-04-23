export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        console.log("[Init] Setting up orphaned file cleanup scheduler...");

        // Dynamically import only in Node.js runtime
        const { cleanupOrphanedFiles } = await import("@/lib/fileCleanup");

        // Run cleanup immediately on startup (after a short delay to let the app initialize)
        setTimeout(async () => {
            console.log("[Init] Running initial cleanup...");
            await cleanupOrphanedFiles();
        }, 5000);

        // Schedule cleanup to run every 6 hours
        setInterval(async () => {
            const now = new Date().toISOString();
            console.log(`[Scheduler] Running scheduled cleanup at ${now}...`);
            await cleanupOrphanedFiles();
        }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

        console.log("[Init] Cleanup scheduler initialized (runs every 6 hours)");
    }
}
