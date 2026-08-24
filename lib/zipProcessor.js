import fs from 'fs/promises';
import path from 'path';
import extractZip from 'extract-zip';

const RASTER_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];

/**
 * Automatically cleans up and removes an institute's previous uploaded assets folder
 */
export async function cleanInstituteAssets(instituteId) {
    if (!instituteId) return;
    const instituteDir = path.join(process.cwd(), 'public/uploads/website_assets', String(instituteId));
    try {
        await fs.rm(instituteDir, { recursive: true, force: true });
        console.log(`[ZIP Processor] Successfully cleaned old assets for institute: ${instituteId}`);
    } catch (err) {
        console.warn(`[ZIP Processor] Could not remove directory ${instituteDir}:`, err.message);
    }
}

/**
 * Filter HTML content:
 * - Keeps inline SVGs and vector icons intact.
 * - Replaces raster image src attributes (png/jpg/webp) with SVG placeholder image URLs.
 */
export function sanitizeHtmlImageAssets(html, placeholderText = "Upload Photo") {
    if (!html || typeof html !== 'string') return html;

    const encodedText = encodeURIComponent(placeholderText);
    const defaultPlaceholderUrl = `https://placehold.co/800x500?text=${encodedText}`;

    // Replace <img ... src="..." ... > if src points to a raster image extension or relative local image path
    return html.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, beforeSrc, src, afterSrc) => {
        const lowerSrc = src.toLowerCase();
        
        // If it's an SVG or already an external SVG/placeholder URL or data URL, leave it intact
        if (lowerSrc.endsWith('.svg') || lowerSrc.includes('placehold.co') || lowerSrc.startsWith('data:image/svg+xml')) {
            return match;
        }

        // Replace raster images with placeholder URL
        return `<img ${beforeSrc}src="${defaultPlaceholderUrl}" ${afterSrc}>`;
    });
}

/**
 * Recursively scans directory:
 * - Deletes heavy raster images (.png, .jpg, .jpeg, .webp, .gif)
 * - Retains vector icons (.svg), stylesheets (.css), scripts (.js), fonts, etc.
 */
export async function filterDirectoryAssets(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                await filterDirectoryAssets(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                
                // Delete heavy raster images
                if (RASTER_IMAGE_EXTENSIONS.includes(ext)) {
                    await fs.unlink(fullPath).catch(() => {});
                    console.log(`[ZIP Processor] Discarded heavy image asset: ${entry.name}`);
                }
            }
        }
    } catch (err) {
        console.warn(`[ZIP Processor] Filter directory warning for ${dirPath}:`, err.message);
    }
}

/**
 * Main process function:
 * 1. Cleans old assets folder for the institute
 * 2. Unzips newly uploaded ZIP to public/uploads/website_assets/[instituteId]
 * 3. Removes heavy raster images while retaining icons/fonts/scripts
 * 4. Deletes temporary raw ZIP file
 */
export async function processWebsiteZip({ zipFilePath, instituteId }) {
    if (!zipFilePath || !instituteId) {
        throw new Error("Missing required zipFilePath or instituteId");
    }

    const targetDir = path.join(process.cwd(), 'public/uploads/website_assets', String(instituteId));

    try {
        // 1. Wipe old institute website assets folder
        await cleanInstituteAssets(instituteId);

        // 2. Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // 3. Extract ZIP contents
        await extractZip(zipFilePath, { dir: targetDir });

        // 4. Discard heavy raster images, keeping SVG vector icons and fonts
        await filterDirectoryAssets(targetDir);

        console.log(`[ZIP Processor] Successfully processed ZIP for institute ${instituteId} in ${targetDir}`);
        return { success: true, targetDir };
    } finally {
        // 5. Always delete the temporary uploaded raw ZIP file
        await fs.unlink(zipFilePath).catch(() => {});
    }
}
