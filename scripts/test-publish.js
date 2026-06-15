import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const WebsiteConfigSchema = new mongoose.Schema({
    status: String,
    instituteId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const WebsitePageSchema = new mongoose.Schema({
    websiteConfigId: mongoose.Schema.Types.ObjectId,
    draftContent: mongoose.Schema.Types.Mixed,
    liveContent: mongoose.Schema.Types.Mixed
}, { strict: false });

const WebsiteConfig = mongoose.models.WebsiteConfig || mongoose.model('WebsiteConfig', WebsiteConfigSchema);
const WebsitePage = mongoose.models.WebsitePage || mongoose.model('WebsitePage', WebsitePageSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate publish transaction
    const session_db = await mongoose.startSession();
    await session_db.withTransaction(async () => {
        const config = await WebsiteConfig.findOne({ subdomain: 'qisdhl' }).session(session_db);
        
        await WebsitePage.updateMany(
            { websiteConfigId: config._id },
            [ { $set: { liveContent: { $ifNull: ["$draftContent", "$sections"] } } } ],
            { session: session_db }
        );
        
        config.status = 'published';
        await config.save({ session: session_db });
    });
    await session_db.endSession();
    
    console.log('Published successfully.');
    process.exit(0);
}
run();
