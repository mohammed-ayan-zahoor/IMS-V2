const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkSyllabus() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to...', process.env.MONGODB_URI.split('@').pop());
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Define simple schema for inspection
        const SubjectSchema = new mongoose.Schema({
            name: String,
            code: String,
            syllabus: Array,
            institute: mongoose.Schema.Types.ObjectId,
            deletedAt: Date
        });
        const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);

        const subjects = await Subject.find({ name: /English/i }).lean();
        
        if (subjects.length === 0) {
            console.log('No subjects found matching "English"');
        } else {
            subjects.forEach(s => {
                console.log(`Subject: ${s.name} (${s.code})`);
                console.log(`ID: ${s._id}`);
                console.log(`Institute: ${s.institute}`);
                console.log(`DeletedAt: ${s.deletedAt}`);
                console.log(`Syllabus length: ${s.syllabus?.length || 0}`);
                console.log(`Syllabus: ${JSON.stringify(s.syllabus, null, 2)}`);
                console.log('---');
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSyllabus();
