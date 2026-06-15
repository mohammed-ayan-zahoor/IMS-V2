export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        console.log("[Init] Setting up orphaned file cleanup and voice reminder schedulers...");

        // Dynamically import only in Node.js runtime
        const { cleanupOrphanedFiles } = await import("@/lib/fileCleanup");
        const { processOverdueReminders } = await import("@/services/overdueReminderService");

        // Run tasks immediately on startup (after a short delay to let the app initialize)
        setTimeout(async () => {
            console.log("[Init] Running initial cleanup...");
            try {
                await cleanupOrphanedFiles();
            } catch (err) {
                console.error("[Init Error] Orphaned files cleanup failed:", err);
            }

            console.log("[Init] Running initial overdue voice reminders processing...");
            try {
                await processOverdueReminders();
            } catch (err) {
                console.error("[Init Error] Overdue voice reminders execution failed:", err);
            }
        }, 10000); // 10s delay to let DB connect

        // Schedule cleanup to run every 6 hours
        setInterval(async () => {
            const now = new Date().toISOString();
            console.log(`[Scheduler] Running scheduled cleanup at ${now}...`);
            try {
                await cleanupOrphanedFiles();
            } catch (err) {
                console.error("[Scheduler Error] Cleanup task failed:", err);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

        // Schedule overdue voice reminders to run every 12 hours
        setInterval(async () => {
            const now = new Date().toISOString();
            console.log(`[Scheduler] Running scheduled overdue voice reminders at ${now}...`);
            try {
                await processOverdueReminders();
            } catch (err) {
                console.error("[Scheduler Error] Overdue voice reminders task failed:", err);
            }
        }, 12 * 60 * 60 * 1000); // 12 hours

        console.log("[Init] Cleanup and Voice Reminder schedulers initialized.");
    }
}
