const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const WebsitePageSchema = new mongoose.Schema({}, { strict: false });
const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', WebsitePageSchema);

function cleanObject(obj, pathStr = '') {
    if (!obj || typeof obj !== 'object') return false;
    let modified = false;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (cleanObject(obj[i], `${pathStr}[${i}]`)) {
                modified = true;
            }
        }
        return modified;
    }

    if (obj.attributes && typeof obj.attributes === 'object') {
        const attrs = obj.attributes;
        for (const key of Object.keys(attrs)) {
            // Check if key starts with a digit or is otherwise an invalid HTML attribute name
            if (/^\d/.test(key) || /[^a-zA-Z0-9_:-]/.test(key)) {
                console.log(`[CLEAN] Found invalid attribute key at ${pathStr}.attributes: "${key}" = "${attrs[key]}"`);
                delete attrs[key];
                modified = true;
            }
        }
    }

    for (const key of Object.keys(obj)) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (cleanObject(obj[key], `${pathStr}.${key}`)) {
                modified = true;
            }
        }
    }

    return modified;
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        const pages = await WebsitePage.find({});
        console.log(`Found ${pages.length} pages in the database.`);

        for (const page of pages) {
            console.log(`Checking page: "${page.title}" (${page.slug})`);
            let draftModified = false;
            let liveModified = false;

            if (page.draftContent) {
                const draftObj = page.draftContent;
                draftModified = cleanObject(draftObj, 'draftContent');
                if (draftModified) {
                    page.markModified('draftContent');
                }
            }

            if (page.liveContent) {
                const liveObj = page.liveContent;
                liveModified = cleanObject(liveObj, 'liveContent');
                if (liveModified) {
                    page.markModified('liveContent');
                }
            }

            if (draftModified || liveModified) {
                console.log(`Saving cleaned page: "${page.title}"`);
                await page.save();
                console.log(`Page "${page.title}" saved successfully.`);
            } else {
                console.log(`Page "${page.title}" is clean.`);
            }
        }
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

run();
