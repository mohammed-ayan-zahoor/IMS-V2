const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const bcrypt = require('bcryptjs');
const { connectDB } = require('../lib/mongodb');
const User = require('../models/User').default || require('../models/User');
const Membership = require('../models/Membership').default || require('../models/Membership');
const Institute = require('../models/Institute').default || require('../models/Institute');

async function testAuth() {
    await connectDB();
    const email = 'test2@gmail.com';
    const user = await User.findOne({ email }).select('+passwordHash');
    console.log("User:", !!user, "deletedAt:", user?.deletedAt);
    if (!user) { process.exit(0); }

    // Check if the hashed password looks like a standard bcrypt hash
    console.log("Password hash starts with $2a or $2b?", /^(\$2[ab]\$)/.test(user.passwordHash));

    const memberships = await Membership.find({
        user: user._id,
        isActive: true
    }).populate({
        path: 'institute',
        select: 'name code branding status isActive subscription'
    });
    console.log("Memberships count:", memberships.length);
    if (memberships.length > 0) {
        console.log("First membership institute status:", memberships[0].institute?.isActive);
        console.log("First membership institute object:", memberships[0].institute ? "exists" : "null");
    }
    process.exit(0);
}
testAuth().catch((err) => {
    console.error(err);
    process.exit(1);
});