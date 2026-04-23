import { readdir, unlink, stat } from "fs/promises";
import path from "path";
import CertificateTemplate from "@/models/CertificateTemplate";

const ORPHANED_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Finds all orphaned uploaded files (not referenced in any certificate template)
 * that are older than 24 hours and deletes them
 */
export async function cleanupOrphanedFiles() {
    try {
        console.log("[Cleanup] Starting orphaned file cleanup...");
        
        const uploadDir = path.join(process.cwd(), "public/uploads");
        
        // Get all files in uploads directory
        const files = await readdir(uploadDir);
        
        if (files.length === 0) {
            console.log("[Cleanup] No files to check");
            return { deleted: 0, checked: 0, error: null };
        }

        // Get all imageUrl values from certificate templates
        const templates = await CertificateTemplate.find({}, { imageUrl: 1 });
        const usedUrls = new Set(
            templates
                .map(t => t.imageUrl)
                .filter(url => url) // Filter out empty URLs
        );

        console.log(`[Cleanup] Found ${files.length} files and ${usedUrls.size} template references`);

        let deletedCount = 0;
        let checkedCount = 0;

        // Check each file
        for (const filename of files) {
            checkedCount++;
            const filepath = path.join(uploadDir, filename);
            
            try {
                // Get file stats
                const stats = await stat(filepath);
                const fileAgeMs = Date.now() - stats.mtimeMs;
                
                // Check if file is orphaned (not in any template)
                const isOrphaned = !usedUrls.has(`/api/uploads/files/${filename}`) && 
                                   !usedUrls.has(`/uploads/${filename}`);
                
                // Check if file is old enough (older than 24 hours)
                const isOldEnough = fileAgeMs > ORPHANED_FILE_AGE_MS;
                
                if (isOrphaned && isOldEnough) {
                    await unlink(filepath);
                    deletedCount++;
                    console.log(`[Cleanup] Deleted orphaned file: ${filename} (age: ${Math.round(fileAgeMs / 1000 / 60 / 60)}h)`);
                }
            } catch (fileError) {
                console.error(`[Cleanup] Error processing file ${filename}:`, fileError.message);
            }
        }

        const result = { deleted: deletedCount, checked: checkedCount, error: null };
        console.log(`[Cleanup] Cleanup complete. Deleted ${deletedCount}/${checkedCount} files.`);
        return result;

    } catch (error) {
        console.error("[Cleanup] Cleanup error:", error);
        return { deleted: 0, checked: 0, error: error.message };
    }
}

/**
 * Get stats about current orphaned files without deleting them
 */
export async function getOrphanedFilesStats() {
    try {
        const uploadDir = path.join(process.cwd(), "public/uploads");
        const files = await readdir(uploadDir);
        
        const templates = await CertificateTemplate.find({}, { imageUrl: 1 });
        const usedUrls = new Set(
            templates
                .map(t => t.imageUrl)
                .filter(url => url)
        );

        let orphanedCount = 0;
        let totalSizeBytes = 0;
        const orphanedFiles = [];

        for (const filename of files) {
            const filepath = path.join(uploadDir, filename);
            const stats = await stat(filepath);
            const fileAgeMs = Date.now() - stats.mtimeMs;
            const isOrphaned = !usedUrls.has(`/api/uploads/files/${filename}`) && 
                               !usedUrls.has(`/uploads/${filename}`);

            if (isOrphaned) {
                orphanedCount++;
                totalSizeBytes += stats.size;
                orphanedFiles.push({
                    filename,
                    size: stats.size,
                    ageHours: Math.round(fileAgeMs / 1000 / 60 / 60),
                    canDelete: fileAgeMs > ORPHANED_FILE_AGE_MS
                });
            }
        }

        return {
            orphanedCount,
            totalSizeBytes,
            files: orphanedFiles.sort((a, b) => b.ageHours - a.ageHours)
        };
    } catch (error) {
        console.error("[Stats] Error getting orphaned files stats:", error);
        return { orphanedCount: 0, totalSizeBytes: 0, files: [], error: error.message };
    }
}
