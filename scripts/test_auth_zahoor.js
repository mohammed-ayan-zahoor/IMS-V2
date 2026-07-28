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

        const email = 'zahoor.qi@gmail.com';
        console.log(`\nSimulating login for: ${email}`);

        // 1. Find user
        const u = await User.findOne({ email }).select("+passwordHash");
        if (!u) {
            console.error('User not found!');
            return;
        }

        console.log(`User ID: ${u._id}`);
        console.log(`Role: ${u.role}`);
        console.log(`DeletedAt: ${u.deletedAt}`);
        console.log(`Status: ${u.status}`);

        // 2. Find memberships
        const memberships = await Membership.find({
            user: u._id,
            isActive: true
        }).populate({
            path: 'institute',
            select: 'name code branding status isActive subscription type settings.features'
        });

        console.log(`Found ${memberships.length} active memberships.`);
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

        // 3. Construct userObject
        console.log('Constructing userObject...');
        const userObject = {
            id: u._id.toString(),
            email: u.email,
            role: activeMembership?.role || u.role,
            name: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim(),
            avatar: u.profile?.avatar || null,
            profile: {
                bio: u.profile?.bio || "",
                phone: u.profile?.phone || "",
                gender: u.profile?.gender || "",
                dateOfBirth: u.profile?.dateOfBirth || null,
                bloodGroup: u.profile?.bloodGroup || "",
                address: u.profile?.address || {},
                fatherName: u.fatherName || "",
                motherName: u.motherName || "",
                grNumber: u.grNumber || "",
                aadharNumber: u.aadharNumber || "",
                socialLinks: u.profile?.socialLinks || {}
            },
            enrollmentNumber: u.enrollmentNumber || null,
            activeSession: u.activeSession || null,
            permissions: u.permissions || [],
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
