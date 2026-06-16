import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const WebsiteConfigSchema = new mongoose.Schema({}, { strict: false });
const WebsiteConfig = mongoose.models.WebsiteConfig || mongoose.model('WebsiteConfig', WebsiteConfigSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const configs = await WebsiteConfig.find({}, 'subdomain instituteId domain status');
    console.log(configs);
    process.exit(0);
}
run().catch(console.error);
