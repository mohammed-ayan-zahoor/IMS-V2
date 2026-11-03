/**
 * audit-historical-lcs.js
 * 
 * Read-only audit script to identify historical LC / TC recipients.
 * Reports students who received an LC prior to Phase 2 but may still have
 * active enrollments or missing isLCIssued flags.
 * 
 * Usage:
 *   node scripts/audit-historical-lcs.js [instituteId]
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
}

async function runAudit() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB.');

        const db = mongoose.connection.db;
        const targetInstituteId = process.argv[2];

        const certQuery = {
            'template.category': { $in: ['LEAVING_CERTIFICATE', 'TRANSFER_CERTIFICATE'] },
            status: { $ne: 'REVOKED' }
        };

        if (targetInstituteId) {
            certQuery.institutionId = new mongoose.Types.ObjectId(targetInstituteId);
        }

        const certificates = await db.collection('certificates').find(certQuery).toArray();
        console.log(`\n📋 Found ${certificates.length} formal exit certificate(s) on record.\n`);

        if (certificates.length === 0) {
            console.log('No historical LC/TC certificates found.');
            await mongoose.disconnect();
            return;
        }

        const report = [];

        for (const cert of certificates) {
            const student = await db.collection('users').findOne({ _id: cert.studentId });
            
            // Check student's current batches
            const batches = await db.collection('batches').find({
                'enrolledStudents.student': cert.studentId,
                deletedAt: null
            }).toArray();

            const activeBatches = [];
            const leftBatches = [];

            for (const b of batches) {
                const enrollment = (b.enrolledStudents || []).find(
                    e => e.student && e.student.toString() === cert.studentId.toString()
                );
                if (enrollment) {
                    if (enrollment.status === 'active') {
                        activeBatches.push(b.name);
                    } else if (enrollment.status === 'left') {
                        leftBatches.push(b.name);
                    }
                }
            }

            report.push({
                certificateId: cert._id.toString(),
                certificateNumber: cert.certificateNumber,
                issueDate: cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-GB') : 'Unknown',
                studentId: cert.studentId.toString(),
                studentName: student ? `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim() : 'Deleted / Unknown User',
                grNumber: student?.profile?.enrollmentNumber || student?.profile?.grNumber || 'N/A',
                isLCIssuedFlag: student?.isLCIssued || false,
                activeBatches: activeBatches.join(', ') || 'None',
                leftBatches: leftBatches.join(', ') || 'None',
                discrepancy: (!student?.isLCIssued || activeBatches.length > 0) ? '⚠️ STILL ACTIVE ON ROSTER' : '✅ CLEAN'
            });
        }

        console.table(report);

        const discrepancies = report.filter(r => r.discrepancy.includes('⚠️'));
        console.log(`\n📊 Summary:`);
        console.log(`- Total LCs Audited: ${report.length}`);
        console.log(`- Fully Reconciled: ${report.length - discrepancies.length}`);
        console.log(`- Discrepancies (LC issued but still on active rosters): ${discrepancies.length}`);

        if (discrepancies.length > 0) {
            console.log('\n💡 Recommendation: Review the above students in Certificate Management or run manual withdrawal for those confirmed to have left.');
        }

        await mongoose.disconnect();
        console.log('\n✅ Audit complete. Database connection closed.');
    } catch (err) {
        console.error('❌ Audit Error:', err);
        process.exit(1);
    }
}

runAudit();
