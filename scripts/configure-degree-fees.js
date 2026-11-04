/**
 * Smt. Danamma Channabasavaiah Degree College (SDCDEGKOLAR)
 * Configure Degree Courses with Per-Semester Billing & Year-Wise Fee Structure
 *
 * Usage:
 *   node scripts/configure-degree-fees.js --dry-run
 *   node scripts/configure-degree-fees.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DEGREE_FEE_CONFIGS = {
    BCOM: {
        code: 'BCOM',
        name: 'Bachelor of Commerce (B.Com)',
        baseSemFee: 23000,
        admissionFee: 15000,
        yearWise: [
            { year: 1, amount: 38000 }, // Sem 1 (15k adm + 23k sem)
            { year: 2, amount: 20000 }, // Sem 3 / 4 (20k sem)
            { year: 3, amount: 20000 }  // Sem 5 / 6 (20k sem)
        ]
    },
    BBA: {
        code: 'BBA',
        name: 'Bachelor of Business Administration (BBA)',
        baseSemFee: 23000,
        admissionFee: 15000,
        yearWise: [
            { year: 1, amount: 38000 }, // Sem 1 (15k adm + 23k sem)
            { year: 2, amount: 20000 }, // Sem 3 / 4 (20k sem)
            { year: 3, amount: 20000 }  // Sem 5 / 6 (20k sem)
        ]
    },
    BCA: {
        code: 'BCA',
        name: 'Bachelor of Computer Applications (BCA)',
        baseSemFee: 30000,
        admissionFee: 30000,
        yearWise: [
            { year: 1, amount: 60000 }, // Sem 1 (30k adm + 30k sem)
            { year: 2, amount: 30000 }, // Sem 3 / 4 (30k sem)
            { year: 3, amount: 25000 }  // Sem 5 / 6 (25k sem)
        ]
    },
    BSC: {
        code: 'BSC',
        name: 'Bachelor of Science (B.Sc)',
        baseSemFee: 23000,
        admissionFee: 15000,
        yearWise: [
            { year: 1, amount: 38000 }, // Sem 1 (15k adm + 23k sem)
            { year: 2, amount: 20000 }, // Sem 3 / 4 (20k sem)
            { year: 3, amount: 18000 }  // Sem 5 / 6 (18k sem)
        ]
    }
};

async function run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('=================================================================');
    console.log('   SDC DEGREE COLLEGE — PER-SEMESTER FEE CONFIGURATION          ');
    console.log('=================================================================');
    console.log(`Mode : ${isDryRun ? '⚠️  DRY-RUN (no writes)' : '🚀 LIVE UPDATE'}`);
    console.log('-----------------------------------------------------------------\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ MONGODB_URI is not set in .env.local');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const Institute = mongoose.models.Institute || (await import('../models/Institute.js')).default;
    const Course = mongoose.models.Course || (await import('../models/Course.js')).default;

    // Find the degree college
    const inst = await Institute.findOne({
        $or: [
            { code: 'SDCDEGKOLAR' },
            { code: 'SDCDEG' },
            { name: { $regex: /danamma/i } }
        ],
        deletedAt: null
    });

    if (!inst) {
        console.error('❌ Degree College not found in this database. Checked codes: SDCDEGKOLAR, SDCDEG, name: Danamma');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`Found Institute: ${inst.name} (${inst.code}) [ID: ${inst._id}]\n`);

    // Ensure institute structure is SEMESTER_BASED
    if (inst.settings?.structure !== 'SEMESTER_BASED') {
        console.log(`Updating institute structure to 'SEMESTER_BASED'...`);
        if (!isDryRun) {
            inst.settings = { ...(inst.settings || {}), structure: 'SEMESTER_BASED' };
            await inst.save();
        }
    }

    // Process each course
    for (const [key, cfg] of Object.entries(DEGREE_FEE_CONFIGS)) {
        let course = await Course.findOne({
            institute: inst._id,
            $or: [{ code: cfg.code }, { name: { $regex: new RegExp(cfg.code, 'i') } }],
            deletedAt: null
        });

        if (!course) {
            console.warn(`⚠️ Course with code ${cfg.code} not found. Searching by name...`);
            course = await Course.findOne({
                institute: inst._id,
                name: { $regex: new RegExp(cfg.name.split(' ')[0], 'i') },
                deletedAt: null
            });
        }

        if (!course) {
            console.error(`❌ Course ${cfg.name} (${cfg.code}) not found in DB!`);
            continue;
        }

        console.log(`Updating Course: ${course.name} [${course.code}]`);
        console.log(`  Base Sem Fee : ₹${cfg.baseSemFee.toLocaleString('en-IN')}`);
        console.log(`  Admission Fee: ₹${cfg.admissionFee.toLocaleString('en-IN')} (1st Sem)`);
        console.log(`  Year 1 (Sem 1 Total): ₹${cfg.yearWise[0].amount.toLocaleString('en-IN')}`);
        console.log(`  Year 2 (Per Sem)    : ₹${cfg.yearWise[1].amount.toLocaleString('en-IN')}`);
        console.log(`  Year 3 (Per Sem)    : ₹${cfg.yearWise[2].amount.toLocaleString('en-IN')}`);

        if (!isDryRun) {
            course.duration = { value: 36, unit: 'months' };
            course.fees = {
                amount: cfg.baseSemFee,
                currency: 'INR',
                feeStructureMode: 'BUNDLED'
            };
            course.collegeConfig = {
                totalSemesters: 6,
                billingCycle: 'SEMESTER',
                yearWiseFees: cfg.yearWise
            };
            await course.save();
            console.log(`  ✅ Successfully updated in DB.\n`);
        } else {
            console.log(`  [DRY-RUN] Would update fees & collegeConfig in DB.\n`);
        }
    }

    console.log('=================================================================');
    console.log('All degree course fees configured successfully!');
    console.log('=================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
