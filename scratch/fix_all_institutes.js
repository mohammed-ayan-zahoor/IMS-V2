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
        
        const result = await Institute.updateMany(
            { type: { $exists: false } },
            { $set: { type: 'VOCATIONAL' } }
        );
        
        const resultNull = await Institute.updateMany(
            { type: null },
            { $set: { type: 'VOCATIONAL' } }
        );
        
        console.log("Update result (exists false):", result);
        console.log("Update result (null):", resultNull);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

update();
