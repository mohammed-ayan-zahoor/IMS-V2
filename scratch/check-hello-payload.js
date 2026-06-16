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
    
    const config = await WebsiteConfig.findOne({ subdomain: 'hello' });
    const page = await WebsitePage.findOne({ websiteConfigId: config._id, slug: 'index' });
    
    if (!page) {
        console.log("hello index page not found!");
        process.exit(0);
    }
    
    const draftContent = page.draftContent || {};
    const gjsDataStr = JSON.stringify(draftContent.gjsData || {});
    
    console.log('--- Size of Draft Content in Database ---');
    console.log(`gjsData size: ${(gjsDataStr.length / 1024 / 1024).toFixed(2)} MB`);
    
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
    
    // Try to fix it!
    if (base64Matches) {
        let cleanDataStr = gjsDataStr;
        for (const match of base64Matches) {
            if (match.length > 50000) { // If larger than 50KB, replace with placeholder
                cleanDataStr = cleanDataStr.replace(match, 'https://placehold.co/800x600/f3f4f6/a1a1aa?text=Image+Removed');
            }
        }
        
        draftContent.gjsData = JSON.parse(cleanDataStr);
        await WebsitePage.updateOne({ _id: page._id }, { $set: { 'draftContent.gjsData': draftContent.gjsData } });
        console.log('Cleaned up massive base64 images from the database!');
    }
    
    process.exit(0);
}
run().catch(console.error);
