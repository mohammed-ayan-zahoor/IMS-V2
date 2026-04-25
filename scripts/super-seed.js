const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({ email: String, passwordHash: String, role: String, profile: { firstName: String, lastName: String } });
const InstituteSchema = new mongoose.Schema({ name: String, code: String, status: { type: String, default: 'active' }, isActive: { type: Boolean, default: true } });
const MembershipSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' }, role: String, isActive: { type: Boolean, default: true } });
const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Institute = mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

async function superSeed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Wipe everything
        await User.deleteMany({});
        await Institute.deleteMany({});
        await Membership.deleteMany({});
        await Counter.deleteMany({});
        console.log('Cleaned database');

        // 2. Create Admin
        const hash = await bcrypt.hash('Admin@123', 10);
        const admin = await User.create({
            email: 'admin@ims.com',
            passwordHash: hash,
            role: 'super_admin',
            profile: { firstName: 'System', lastName: 'Admin' }
        });
        console.log('Created Admin: admin@ims.com');

        // 3. Create Institute
        const inst = await Institute.create({
            name: "Demo Institute",
            code: "DEMO101",
            status: 'active',
            isActive: true
        });
        console.log('Created Institute: DEMO101');

        // 4. Link them
        await Membership.create({
            user: admin._id,
            institute: inst._id,
            role: 'super_admin',
            isActive: true
        });
        console.log('Linked Admin to Institute');

        console.log('SUCCESS: You can now log in!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
superSeed();
