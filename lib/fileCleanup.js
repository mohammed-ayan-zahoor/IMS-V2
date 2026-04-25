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

        await connectDB();

        // Get all used URLs from various models
        const [certTemplates, idCardTemplates, materials, users, institutes] = await Promise.all([
            CertificateTemplate.find({}, { imageUrl: 1 }).lean(),
            IDCardTemplate.find({}, { frontImageUrl: 1, backImageUrl: 1 }).lean(),
            Material.find({}, { "file.url": 1 }).lean(),
            User.find({ "profile.avatar": { $exists: true, $ne: null } }, { "profile.avatar": 1 }).lean(),
            Institute.find({}, { "branding.logo": 1, "branding.favicon": 1 }).lean()
        ]);

        const usedUrls = new Set();
        
        // Certificates
        certTemplates.forEach(t => { if (t.imageUrl) usedUrls.add(t.imageUrl); });
        
        // ID Cards
        idCardTemplates.forEach(t => {
            if (t.frontImageUrl) usedUrls.add(t.frontImageUrl);
            if (t.backImageUrl) usedUrls.add(t.backImageUrl);
        });

        // Materials
        materials.forEach(m => { if (m.file?.url) usedUrls.add(m.file.url); });

        // User Avatars
        users.forEach(u => { if (u.profile?.avatar) usedUrls.add(u.profile.avatar); });

        // Institute Branding
        institutes.forEach(i => {
            if (i.branding?.logo) usedUrls.add(i.branding.logo);
            if (i.branding?.favicon) usedUrls.add(i.branding.favicon);
        });

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
        
        await connectDB();
        // Get all used URLs from various models
        const [certTemplates, idCardTemplates, materials, users, institutes] = await Promise.all([
            CertificateTemplate.find({}, { imageUrl: 1 }).lean(),
            IDCardTemplate.find({}, { frontImageUrl: 1, backImageUrl: 1 }).lean(),
            Material.find({}, { "file.url": 1 }).lean(),
            User.find({ "profile.avatar": { $exists: true, $ne: null } }, { "profile.avatar": 1 }).lean(),
            Institute.find({}, { "branding.logo": 1, "branding.favicon": 1 }).lean()
        ]);

        const usedUrls = new Set();
        
        // Certificates
        certTemplates.forEach(t => { if (t.imageUrl) usedUrls.add(t.imageUrl); });
        
        // ID Cards
        idCardTemplates.forEach(t => {
            if (t.frontImageUrl) usedUrls.add(t.frontImageUrl);
            if (t.backImageUrl) usedUrls.add(t.backImageUrl);
        });

        // Materials
        materials.forEach(m => { if (m.file?.url) usedUrls.add(m.file.url); });

        // User Avatars
        users.forEach(u => { if (u.profile?.avatar) usedUrls.add(u.profile.avatar); });

        // Institute Branding
        institutes.forEach(i => {
            if (i.branding?.logo) usedUrls.add(i.branding.logo);
            if (i.branding?.favicon) usedUrls.add(i.branding.favicon);
        });

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
