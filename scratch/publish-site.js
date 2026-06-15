const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

const configSchema = new mongoose.Schema({
    subdomain: String,
    domain: String,
    instituteId: mongoose.Schema.Types.ObjectId,
    isActive: Boolean,
    status: String,
});

const pageSchema = new mongoose.Schema({
    title: String,
    slug: String,
    websiteConfigId: mongoose.Schema.Types.ObjectId,
    draftContent: mongoose.Schema.Types.Mixed,
    liveContent: mongoose.Schema.Types.Mixed,
});

const WebsiteConfig = mongoose.models.WebsiteConfig || mongoose.model('WebsiteConfig', configSchema);
const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', pageSchema);

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const config = await WebsiteConfig.findOne({ subdomain: 'test' });
    if (!config) {
        console.error("Config for 'test' not found");
        process.exit(1);
    }

    console.log(`Original status: ${config.status}`);
    
    // Copy draftContent to liveContent
    const pages = await WebsitePage.find({ websiteConfigId: config._id });
    console.log(`Found ${pages.length} pages to publish:`);
    for (const p of pages) {
        console.log(`- Page: ${p.title}, Slug: ${p.slug}`);
        if (p.draftContent) {
            p.liveContent = p.draftContent;
            p.markModified('liveContent');
            await p.save();
            console.log(`  Copied draftContent to liveContent successfully.`);
        } else {
            console.log(`  Warning: Page has no draftContent!`);
        }
    }

    config.status = 'published';
    await config.save();
    console.log(`Updated website status to 'published'`);

    await mongoose.disconnect();
}

run().catch(console.error);
