const mongoose = require('mongoose');

// Define schemas (simplified)
const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    institute: mongoose.Schema.Types.ObjectId,
    deletedAt: { type: Date, default: null }
});

const MembershipSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    institute: mongoose.Schema.Types.ObjectId,
    role: String,
    isActive: { type: Boolean, default: true }
});

async function fixMemberships() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ims-v2');
        console.log("Connected to DB");

        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

        // Find all active admins and instructors who have an institute field
        const users = await User.find({
            role: { $in: ['admin', 'instructor'] },
            deletedAt: null,
            institute: { $exists: true, $ne: null }
        });

        console.log(`Found ${users.length} potential admins/instructors to check.`);

        let fixedCount = 0;
        for (const user of users) {
            // Check if membership already exists
            const membership = await Membership.findOne({
                user: user._id,
                institute: user.institute,
                isActive: true
            });

            if (!membership) {
                console.log(`Fixing missing membership for: ${user.email} (Role: ${user.role}, Institute: ${user.institute})`);
                await Membership.create({
                    user: user._id,
                    institute: user.institute,
                    role: user.role,
                    isActive: true
                });
                fixedCount++;
            }
        }

        console.log(`\nFix complete. Created ${fixedCount} missing membership records.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

fixMemberships();
