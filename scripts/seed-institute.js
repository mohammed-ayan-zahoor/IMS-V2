const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const InstituteSchema = new mongoose.Schema({
    name: String,
    code: String,
    status: { type: String, default: 'active' },
    isActive: { type: Boolean, default: true }
});

const MembershipSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    role: String,
    isActive: { type: Boolean, default: true }
});

const UserSchema = new mongoose.Schema({ email: String });

const Institute = mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create Default Institute
        const inst = await Institute.create({
            name: "Demo Institute",
            code: "DEMO101",
            status: 'active',
            isActive: true
        });
        console.log('Created Institute: DEMO101');

        // 2. Link Admin to this Institute
        const admin = await User.findOne({ email: 'admin@ims.com' });
        if (admin) {
            await Membership.create({
                user: admin._id,
                institute: inst._id,
                role: 'super_admin',
                isActive: true
            });
            console.log('Linked admin@ims.com to the institute');
        }

        console.log('Seeding finished!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
