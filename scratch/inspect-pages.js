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

    const configs = await WebsiteConfig.find({});
    for (const c of configs) {
        console.log(`Config ID: ${c._id}`);
        console.log(`  Subdomain: ${c.subdomain}`);
        console.log(`  isActive: ${c.isActive}`);
        console.log(`  status: ${c.status}`);
        
        const pages = await WebsitePage.find({ websiteConfigId: c._id });
        console.log(`  Pages (${pages.length}):`);
        for (const p of pages) {
            console.log(`    - Slug: ${p.slug}, Has draft: ${!!p.draftContent}, Has live: ${!!p.liveContent}`);
        }
    }
    
    await mongoose.disconnect();
}

run().catch(console.error);
