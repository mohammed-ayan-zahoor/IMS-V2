const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Mock models since we are running in a standalone script
const UserSchema = new mongoose.Schema({
    email: String,
    passwordHash: String,
    role: String,
    institute: mongoose.Schema.Types.ObjectId,
    deletedAt: { type: Date, default: null }
});

const InstituteSchema = new mongoose.Schema({
    name: String,
    status: String,
    isActive: Boolean,
    code: String
});

const MembershipSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    institute: mongoose.Schema.Types.ObjectId,
    role: String,
    isActive: Boolean
});

async function debugAuth() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ims-v2'); // Assuming local dev DB
        console.log("Connected to DB");

        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const Institute = mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
        const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

        const email = 'arman@example.com'; // User needs to provide the exact email, but I'll search for 'arman'
        const users = await User.find({ email: /arman/i }).select('+passwordHash');
        
        if (users.length === 0) {
            console.log("No user found with 'arman' in email");
            return;
        }

        for (const user of users) {
            console.log(`\n--- Debugging User: ${user.email} ---`);
            console.log(`ID: ${user._id}`);
            console.log(`Role: ${user.role}`);
            console.log(`DeletedAt: ${user.deletedAt}`);
            console.log(`Hash exists: ${!!user.passwordHash}`);
            
            // Try common passwords if the user didn't specify
            const testPasswords = ['Admin@123', 'arman123', 'Password@123']; // Based on typical complexity requirements
            for (const pw of testPasswords) {
                const isValid = await bcrypt.compare(pw, user.passwordHash);
                console.log(`Test password '${pw}': ${isValid ? 'VALID' : 'INVALID'}`);
            }

            // Check Memberships
            const memberships = await Membership.find({ user: user._id, isActive: true }).populate('institute');
            console.log(`Active Memberships: ${memberships.length}`);
            for (const m of memberships) {
                const inst = await Institute.findById(m.institute);
                console.log(`  - Institute: ${inst?.name} (${inst?.code})`);
                console.log(`    Status: ${inst?.status}, IsActive: ${inst?.isActive}`);
                if (inst?.status !== 'active' || !inst?.isActive) {
                    console.log(`    !!! BLOCKED by Institute Status !!!`);
                }
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

debugAuth();
