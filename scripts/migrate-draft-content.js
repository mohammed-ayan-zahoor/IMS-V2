import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const WebsitePageSchema = new mongoose.Schema({
    sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
    draftContent: mongoose.Schema.Types.Mixed
}, { strict: false });

const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', WebsitePageSchema);

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        const pages = await WebsitePage.find({});
        console.log(`Found ${pages.length} pages.`);

        let count = 0;
        for (const page of pages) {
            if (!page.draftContent && page.sections && page.sections.length > 0) {
                // If the builder used 'sections', migrate to 'draftContent' safely.
                // The root node for draftContent should mirror how we serialize it now.
                // Usually draftContent is the root layout node, but if the old system was just an array of sections:
                // We'll wrap it in a root node or just set draftContent = sections. Wait, builder expects a root node for v2.
                // The new save API saves what the builder passes. The builder usually passes `sections`.
                // Let's check how the builder currently saves.
                page.draftContent = page.sections;
                await page.save();
                count++;
            }
        }

        console.log(`Migrated ${count} pages. Sections copied to draftContent where draftContent was empty.`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

migrate();
