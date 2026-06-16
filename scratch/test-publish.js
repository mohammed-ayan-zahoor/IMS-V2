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
    
    // Simulate the exact code from publish/route.js
    try {
        const config = await WebsiteConfig.findOne({ subdomain: 'hello' }); // test with hello config
        if (!config) throw new Error("Website configuration not found");

        console.log("Config found:", config._id);
        
        // Atomic update to copy draftContent to liveContent
        const result = await WebsitePage.updateMany(
            { websiteConfigId: config._id },
            [
                {
                    $set: {
                        liveContent: { $ifNull: ["$draftContent", "$sections"] }
                    }
                }
            ]
        );
        
        console.log("UpdateMany result:", result);

        config.status = 'published';
        await config.save();
        
        console.log("Publish success!");
    } catch (e) {
        console.error("SIMULATED PUBLISH ERROR:", e);
    }
    
    process.exit(0);
}
run().catch(console.error);
