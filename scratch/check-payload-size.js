import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const WebsiteConfigSchema = new mongoose.Schema({}, { strict: false });
const WebsitePageSchema = new mongoose.Schema({}, { strict: false });
const WebsiteConfig = mongoose.models.WebsiteConfig || mongoose.model('WebsiteConfig', WebsiteConfigSchema);
const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', WebsitePageSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // The user is working on STANNS. Let's find it.
    const config = await WebsiteConfig.findOne({ subdomain: { $regex: new RegExp(`^stanns$`, 'i') } });
    if (!config) {
        console.log("STANNS config not found!");
        process.exit(0);
    }
    
    const page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: 'index' });
    if (!page) {
        console.log("STANNS index page not found!");
        process.exit(0);
    }
    
    const draftContent = page.draftContent || {};
    const gjsDataStr = JSON.stringify(draftContent.gjsData || {});
    const gjsHtml = draftContent.gjsHtml || '';
    const gjsCss = draftContent.gjsCss || '';
    
    console.log('--- Size of Draft Content in Database ---');
    console.log(`gjsData size: ${(gjsDataStr.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`gjsHtml size: ${(gjsHtml.length / 1024).toFixed(2)} KB`);
    console.log(`gjsCss size:  ${(gjsCss.length / 1024).toFixed(2)} KB`);
    
    // Check if there are any massive base64 strings in gjsData
    const base64Matches = gjsDataStr.match(/data:image\/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]+/g);
    if (base64Matches) {
        console.log(`\nFound ${base64Matches.length} base64 images in gjsData.`);
        for (let i = 0; i < base64Matches.length; i++) {
            console.log(`  Image ${i+1}: ${(base64Matches[i].length / 1024 / 1024).toFixed(2)} MB`);
        }
    } else {
        console.log('\nNo base64 images found in gjsData.');
    }
    
    process.exit(0);
}
run().catch(console.error);
