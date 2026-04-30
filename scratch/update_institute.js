const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function update() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Institute = mongoose.model('Institute', new mongoose.Schema({
            name: String,
            code: String,
            type: String
        }));
        
        const result = await Institute.updateOne(
            { code: 'QUANTECH' },
            { $set: { type: 'SCHOOL' } }
        );
        
        console.log("Update result:", result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

update();
