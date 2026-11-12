/**
 * scripts/cleanup-non-admin-login-audit-logs.js
 *
 * Removes audit logs for user logins where the actor is NOT 'admin' or 'super_admin'.
 * Usage:
 *   node scripts/cleanup-non-admin-login-audit-logs.js --dry-run   (inspect what would be deleted)
 *   node scripts/cleanup-non-admin-login-audit-logs.js             (perform actual deletion)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

async function main() {
    const isDryRun = process.argv.includes('--dry-run');

    console.log("=================================================================");
    console.log("    CLEANUP: Remove Non-Admin / Non-SuperAdmin Login Audit Logs   ");
    console.log("=================================================================");
    console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no writes)' : '🚀 LIVE (will delete matching logs)'}`);

    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Get all admin and super_admin user IDs
    const adminUsers = await User.find({
        role: { $in: ['admin', 'super_admin'] }
    }).select('_id').lean();

    const adminUserIds = adminUsers.map(u => u._id);
    console.log(`Found ${adminUserIds.length} admin/super_admin users in database.`);

    // 2. Query all 'user.login' audit logs that do NOT belong to admin/super_admin:
    const filter = {
        action: 'user.login',
        $and: [
            {
                $or: [
                    { 'details.actorSnapshot.role': { $nin: ['admin', 'super_admin'] } },
                    { 'details.actorSnapshot.role': { $exists: false } },
                    { 'details.actorSnapshot.role': null }
                ]
            },
            {
                actor: { $nin: adminUserIds }
            }
        ]
    };

    const count = await AuditLog.countDocuments(filter);
    console.log(`\nFound ${count} 'user.login' audit log entries for non-admin/super_admin users.`);

    if (count > 0) {
        // Sample preview
        const samples = await AuditLog.find(filter)
            .limit(5)
            .populate('actor', 'email role profile.firstName profile.lastName')
            .lean();

        console.log("\nSample logs to be removed:");
        samples.forEach((s, idx) => {
            const role = s.details?.actorSnapshot?.role || s.actor?.role || 'unknown';
            const name = s.details?.actorSnapshot?.name || (s.actor?.profile ? `${s.actor.profile.firstName || ''} ${s.actor.profile.lastName || ''}`.trim() : 'Unknown');
            const email = s.actor?.email || 'N/A';
            console.log(`  ${idx + 1}. [${s.createdAt ? new Date(s.createdAt).toISOString() : 'No date'}] Actor: ${name} (${email}) | Role: ${role}`);
        });

        if (!isDryRun) {
            const deleteResult = await AuditLog.deleteMany(filter);
            console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} non-admin login audit logs.`);
        } else {
            console.log(`\n⚠️ DRY RUN complete. Re-run without --dry-run to delete.`);
        }
    } else {
        console.log("No non-admin login audit logs found to clean up.");
    }

    await mongoose.disconnect();
    console.log("Done.");
}

main().catch(err => {
    console.error("Cleanup script failed:", err);
    process.exit(1);
});
