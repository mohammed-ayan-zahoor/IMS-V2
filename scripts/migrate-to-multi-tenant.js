import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Import models
// Note: In a script, dynamic imports or direct file imports might be trickier with Next.js aliases.
// We will use relative paths assuming this runs from project root or scripts folder.
// Since we used 'export default' in models, we need to import them carefully.
// BUT: Mongoose models are singletons. If we define the schema again here or import the files, it should work.
// Best approach for a robust script: Import the model files which use mongoose.models check.

// We need to use dynamic imports for models because they might use aliases '@/' which node doesn't understand by default (unless TS/Babel).
// Hack: We'll assume the script is run with something that handles aliases OR we just redefine schemas here briefly or point to relative paths.
// Let's rely on relative paths for now.
import Institute from '../models/Institute.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Exam from '../models/Exam.js';
import Fee from '../models/Fee.js';
import Material from '../models/Material.js';
import Attendance from '../models/Attendance.js';
import Question from '../models/Question.js';
import AuditLog from '../models/AuditLog.js';

async function migrate() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Step 1: Create Default Institute
        const defaultInstituteCode = 'DEFAULT';
        let defaultInstitute = await Institute.findOne({ code: defaultInstituteCode });

        if (!defaultInstitute) {
            defaultInstitute = await Institute.create({
                name: 'Default Institute',
                code: defaultInstituteCode,
                contactEmail: 'admin@default-institute.com',
                status: 'active',
                subscription: {
                    plan: 'enterprise',
                    isActive: true
                },
                limits: {
                    maxStudents: 10000,
                    maxAdmins: 100,
                    maxCourses: 500,
                    maxStorageGB: 1000
                }
            });

            console.log('✅ Created default institute:', defaultInstitute.code, defaultInstitute._id);
        } else {
            console.log('ℹ️  Default institute already exists:', defaultInstitute._id);
        }

        const instituteId = defaultInstitute._id;

        // Step 2: Update all existing records with default institute
        const models = [
            { name: 'User', model: User },
            { name: 'Course', model: Course },
            { name: 'Batch', model: Batch },
            { name: 'Exam', model: Exam },
            { name: 'Fee', model: Fee },
            { name: 'Material', model: Material },
            { name: 'Attendance', model: Attendance },
            { name: 'Question', model: Question },
            { name: 'AuditLog', model: AuditLog }
        ];

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            for (const { name, model } of models) {
                // Find records that DO NOT have an institute field
                const result = await model.updateMany(
                    { institute: { $exists: false } },
                    { $set: { institute: instituteId } },
                    { session }
                );

                console.log(`✅ Updated ${result.modifiedCount} ${name} records to Institute: ${instituteId}`);
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
        // Step 3: Update usage statistics
        await defaultInstitute.updateUsage();
        console.log('✅ Updated institute usage statistics');

        // Refresh institute data to get latest usage
        const updatedInstitute = await Institute.findById(instituteId);

        console.log('\n🎉 Migration completed successfully!');
        console.log(`\nDefault Institute Details:`);
        console.log(`  Code: ${updatedInstitute.code}`);
        console.log(`  Students: ${updatedInstitute.usage ? updatedInstitute.usage.studentCount : 'N/A'}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        if (process.exitCode === 1) {
            process.exit(1);
        }
    }
}

migrate();
