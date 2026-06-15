const mongoose = require('mongoose');
const path = require('path');
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

    const page = await WebsitePage.findOne({ slug: 'index', websiteConfigId: new mongoose.Types.ObjectId('6a2fd01128371127f161da73') });
    if (!page) {
        console.error("Page not found");
        process.exit(1);
    }

    const html = page.liveContent?.gjsHtml || '';
    
    // Let's find the testimonials section in the HTML
    const testimonialsIndex = html.indexOf('id="testimonials"');
    if (testimonialsIndex !== -1) {
        console.log("Testimonials section HTML segment:");
        console.log(html.substring(testimonialsIndex, testimonialsIndex + 3000));
    } else {
        console.log("Testimonials section ID not found. Printing first 2000 chars of HTML instead:");
        console.log(html.substring(0, 2000));
    }
    
    await mongoose.disconnect();
}

run().catch(console.error);
