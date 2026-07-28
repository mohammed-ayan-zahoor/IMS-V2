import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Institute from '../models/Institute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'inseramkazi@gmail.com';
        console.log(`\nSimulating login for: ${email}`);

        // 1. Find user
        const users = await User.find({ email: email }).select("+passwordHash");
        console.log(`Found ${users.length} users with this email.`);

        const activeUser = users.find(u => !u.deletedAt);
        const user = activeUser || users[0];

        if (!user) {
            console.error('No user found at all!');
            return;
        }

        console.log(`Selected User ID: ${user._id}, DeletedAt: ${user.deletedAt}`);

        if (user.deletedAt) {
            console.error('User is deleted! Throwing error.');
            throw new Error("Your account has been disabled");
        }

        // 2. Memberships
        const memberships = await Membership.find({
            user: user._id,
            isActive: true
        }).populate({
            path: 'institute',
            select: 'name code branding status isActive subscription type settings.features'
        });

        console.log(`Found ${memberships.length} memberships.`);
        for (const m of memberships) {
            console.log(`  - Membership ID: ${m._id}, Institute populated: ${!!m.institute}`);
            if (m.institute) {
                console.log(`    Institute: ${m.institute.name}, Status: ${m.institute.status}, IsActive: ${m.institute.isActive}`);
            }
        }

        let activeMembership = memberships[0];
        console.log(`Selected active membership: ${activeMembership ? activeMembership._id : 'None'}`);

        if (!activeMembership) {
            console.error('No active membership found! Login will fail (return null).');
        }

        const activeInstitute = activeMembership?.institute;
        if (activeInstitute) {
            if (activeInstitute.status !== 'active' || !activeInstitute.isActive) {
                console.error(`Institute is inactive or disabled! Status: ${activeInstitute.status}, isActive: ${activeInstitute.isActive}`);
            }
            if (activeInstitute.subscription?.endDate && new Date() > activeInstitute.subscription.endDate) {
                console.error(`Subscription expired! EndDate: ${activeInstitute.subscription.endDate}`);
            }
        }

        // 3. Construct userObject (same as lib/auth.js)
        console.log('Constructing userObject...');
        const userObject = {
            id: user._id.toString(),
            email: user.email,
            role: activeMembership?.role || user.role,
            name: `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim(),
            avatar: user.profile?.avatar || null,
            profile: {
                bio: user.profile?.bio || "",
                phone: user.profile?.phone || "",
                gender: user.profile?.gender || "",
                dateOfBirth: user.profile?.dateOfBirth || null,
                bloodGroup: user.profile?.bloodGroup || "",
                address: user.profile?.address || {},
                fatherName: user.fatherName || "",
                motherName: user.motherName || "",
                grNumber: user.grNumber || "",
                aadharNumber: user.aadharNumber || "",
                socialLinks: user.profile?.socialLinks || {}
            },
            enrollmentNumber: user.enrollmentNumber || null,
            activeSession: user.activeSession || null,
            permissions: user.permissions || [],
            institute: activeInstitute ? {
                id: activeInstitute._id.toString(),
                name: activeInstitute.name,
                code: activeInstitute.code,
                logo: activeInstitute.branding?.logo || null,
                type: activeInstitute.type,
                features: activeInstitute.settings?.features || {}
            } : null,
            availableInstitutes: memberships
                .filter(m => m.institute && m.institute._id)
                .map(m => ({
                    id: m.institute._id.toString(),
                    name: m.institute.name,
                    code: m.institute.code,
                    role: m.role,
                    type: m.institute.type
                }))
        };

        console.log('Successfully constructed userObject:', JSON.stringify(userObject, null, 2));

    } catch (err) {
        console.error('FATAL ERROR DURING SIMULATION:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
