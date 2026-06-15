const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

const pageSchema = new mongoose.Schema({
    title: String,
    slug: String,
    websiteConfigId: mongoose.Schema.Types.ObjectId,
    draftContent: mongoose.Schema.Types.Mixed,
    liveContent: mongoose.Schema.Types.Mixed,
});

const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', pageSchema);

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const page = await WebsitePage.findById("6a2fd01228371127f161da78");
    if (!page) {
        console.error("Page not found");
        process.exit(1);
    }

    if (page.draftContent) {
        fs.writeFileSync(path.join(__dirname, 'draft.html'), page.draftContent.gjsHtml || '');
        fs.writeFileSync(path.join(__dirname, 'draft.css'), page.draftContent.gjsCss || '');
        console.log("Dumped HTML and CSS to scratch/draft.html and scratch/draft.css");
    } else {
        console.log("No draftContent on this page");
    }
    
    await mongoose.disconnect();
}

run().catch(console.error);
