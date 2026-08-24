import { readdir, unlink, stat } from "fs/promises";
import path from "path";

async function runCleanup() {
    const uploadDir = path.join(process.cwd(), "public/uploads");
    try {
        const files = await readdir(uploadDir);
        let deleted = 0;
        for (const file of files) {
            // Delete testing font files, temporary extracted template images, etc.
            if (file.startsWith("17") || file.includes("merriweather") || file.includes("raleway") || file.includes("montserrat") || file.includes("ionicons")) {
                const filepath = path.join(uploadDir, file);
                await unlink(filepath).catch(() => {});
                deleted++;
            }
        }
        console.log(`Successfully cleared ${deleted} test files from public/uploads.`);
    } catch (e) {
        console.error("Cleanup error:", e);
    }
}

runCleanup();
