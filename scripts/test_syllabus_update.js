const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testUpdate() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        await mongoose.connect(MONGODB_URI);

        const Subject = mongoose.models.Subject || mongoose.model('Subject', new mongoose.Schema({
            name: String,
            code: String,
            syllabus: Array,
            institute: mongoose.Schema.Types.ObjectId,
            deletedAt: Date
        }, { collection: 'subjects' }));

        const subjectId = '69d886ada09c84932ef26136'; // From diagnostic
        const instituteId = '69a68df50e2531d5827beb5c'; // From diagnostic

        const mockChapters = [
            {
                title: "  Verified Chapter  ",
                topics: [
                    {
                        title: "  Verified Topic  ",
                        subTopics: [
                            { title: "  Verified Subtopic  " }
                        ]
                    },
                    { title: "" } // Should be filtered out
                ]
            },
            { title: "  " } // Should be filtered out
        ];

        console.log('Attempting update for ID:', subjectId);
        
        // Simulating the new service logic
        const normalizedChapters = (mockChapters || [])
            .filter(ch => ch.title && ch.title.trim())
            .map((ch, ci) => ({
                title: ch.title.trim(),
                order: ci,
                topics: (ch.topics || [])
                    .filter(tp => tp.title && tp.title.trim())
                    .map((tp, ti) => ({
                        title: tp.title.trim(),
                        order: ti,
                        subTopics: (tp.subTopics || [])
                            .filter(st => st.title && st.title.trim())
                            .map((st, si) => ({ 
                                title: st.title.trim(), 
                                order: si 
                            }))
                    }))
            }));

        const result = await Subject.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(subjectId) },
            { $set: { syllabus: normalizedChapters } },
            { new: true, runValidators: true }
        ).lean();

        if (result && result.syllabus?.length === 1) {
            console.log('Update Successful! Logic verified.');
            console.log('Chapter Title (trimmed):', result.syllabus[0].title);
            console.log('Topic count (filtered):', result.syllabus[0].topics.length);
        } else {
            console.log('Update failed or structure unexpected:', result?.syllabus);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Update Error:', err);
    }
}

testUpdate();
