const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Institute = mongoose.model('Institute', new mongoose.Schema({
            name: String,
            code: String,
            type: String
        }));
        
        // Find by code from screenshot if possible, or just list all
        const institutes = await Institute.find({});
        console.log("Institutes in DB:");
        institutes.forEach(inst => {
            console.log(`- ${inst.name} (${inst.code}): type=${inst.type}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
