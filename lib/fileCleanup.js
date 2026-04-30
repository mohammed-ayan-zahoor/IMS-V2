'use server';

import { readdir, unlink, stat } from "fs/promises";
import path from "path";
import CertificateTemplate from "@/models/CertificateTemplate";
import IDCardTemplate from "@/models/IDCardTemplate";
import Material from "@/models/Material";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { connectDB } from "@/lib/mongodb";

const ORPHANED_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Helper to extract filename from any URL format
 * (e.g. /api/uploads/files/123.png, /uploads/123.png, or http://domain.com/api/uploads/files/123.png)
 */
function getFilenameFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
}

/**
 * Finds all orphaned uploaded files (not referenced in any model)
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

        await connectDB();

        // Get all used URLs from various models
        const [certTemplates, idCardTemplates, materials, users, institutes] = await Promise.all([
            CertificateTemplate.find({ deletedAt: null }, { imageUrl: 1 }).lean(),
            IDCardTemplate.find({}, { frontImageUrl: 1, backImageUrl: 1, frontPlaceholders: 1, backPlaceholders: 1 }).lean(),
            Material.find({ deletedAt: null }, { "file.url": 1 }).lean(),
            User.find({ deletedAt: null, "profile.avatar": { $exists: true, $ne: null } }, { "profile.avatar": 1 }).lean(),
            Institute.find({}, { "branding.logo": 1, "branding.favicon": 1 }).lean()
        ]);

        const usedFilenames = new Set();
        
        // Helper to add filename to set
        const addUrl = (url) => {
            const filename = getFilenameFromUrl(url);
            if (filename) usedFilenames.add(filename);
        };

        // Certificates
        certTemplates.forEach(t => addUrl(t.imageUrl));
        
        // ID Cards
        idCardTemplates.forEach(t => {
            addUrl(t.frontImageUrl);
            addUrl(t.backImageUrl);
            
            // Scan placeholders for any image element
            [t.frontPlaceholders, t.backPlaceholders].forEach(placeholders => {
                if (!placeholders) return;
                // Placeholders could be a Map or a plain object
                const entries = (placeholders instanceof Map) ? placeholders.entries() : Object.entries(placeholders);
                for (const [_, config] of entries) {
                    if (config.type === 'image' && config.staticText) { // Static image URL might be here
                        addUrl(config.staticText);
                    }
                    // For field-based images (studentPhoto), they are covered by the User scan
                }
            });
        });

        // Materials
        materials.forEach(m => addUrl(m.file?.url));

        // User Avatars
        users.forEach(u => addUrl(u.profile?.avatar));

        // Institute Branding
        institutes.forEach(i => {
            addUrl(i.branding?.logo);
            addUrl(i.branding?.favicon);
        });

        console.log(`[Cleanup] Found ${files.length} files and ${usedFilenames.size} unique references`);

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
                const isUsed = usedFilenames.has(filename);
                
                // Check if file is old enough (older than 24 hours)
                const isOldEnough = fileAgeMs > ORPHANED_FILE_AGE_MS;
                
                if (!isUsed && isOldEnough) {
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
        
        await connectDB();
        // Get all used URLs from various models
        const [certTemplates, idCardTemplates, materials, users, institutes] = await Promise.all([
            CertificateTemplate.find({ deletedAt: null }, { imageUrl: 1 }).lean(),
            IDCardTemplate.find({}, { frontImageUrl: 1, backImageUrl: 1, frontPlaceholders: 1, backPlaceholders: 1 }).lean(),
            Material.find({ deletedAt: null }, { "file.url": 1 }).lean(),
            User.find({ deletedAt: null, "profile.avatar": { $exists: true, $ne: null } }, { "profile.avatar": 1 }).lean(),
            Institute.find({}, { "branding.logo": 1, "branding.favicon": 1 }).lean()
        ]);

        const usedFilenames = new Set();
        const addUrl = (url) => {
            const filename = getFilenameFromUrl(url);
            if (filename) usedFilenames.add(filename);
        };

        certTemplates.forEach(t => addUrl(t.imageUrl));
        idCardTemplates.forEach(t => {
            addUrl(t.frontImageUrl);
            addUrl(t.backImageUrl);
            [t.frontPlaceholders, t.backPlaceholders].forEach(placeholders => {
                if (!placeholders) return;
                const entries = (placeholders instanceof Map) ? placeholders.entries() : Object.entries(placeholders);
                for (const [_, config] of entries) {
                    if (config.type === 'image' && config.staticText) addUrl(config.staticText);
                }
            });
        });
        materials.forEach(m => addUrl(m.file?.url));
        users.forEach(u => addUrl(u.profile?.avatar));
        institutes.forEach(i => {
            addUrl(i.branding?.logo);
            addUrl(i.branding?.favicon);
        });

        let orphanedCount = 0;
        let totalSizeBytes = 0;
        const orphanedFiles = [];

        for (const filename of files) {
            const filepath = path.join(uploadDir, filename);
            const stats = await stat(filepath);
            const fileAgeMs = Date.now() - stats.mtimeMs;
            const isUsed = usedFilenames.has(filename);

            if (!isUsed) {
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
