import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const MembershipSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    role: String,
    isActive: Boolean
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Find all students
    const students = await User.find({ role: 'student' }).select('_id institute');
    console.log(`Found ${students.length} total students in DB.`);

    // Find existing memberships
    const memberships = await Membership.find({ role: 'student' });
    const membershipSet = new Set(memberships.map(m => `${m.user.toString()}_${m.institute?.toString()}`));

    const missingMemberships = [];
    
    for (const student of students) {
        if (!student.institute) continue;
        const key = `${student._id.toString()}_${student.institute.toString()}`;
        
        if (!membershipSet.has(key)) {
            missingMemberships.push({
                user: student._id,
                institute: student.institute,
                role: 'student',
                isActive: true
            });
        }
    }

    if (missingMemberships.length > 0) {
        console.log(`Found ${missingMemberships.length} students missing memberships. Healing...`);
        await Membership.insertMany(missingMemberships);
        console.log("Healing complete! All students can now log in.");
    } else {
        console.log("No missing memberships found.");
    }

    process.exit(0);
}
run().catch(console.error);
