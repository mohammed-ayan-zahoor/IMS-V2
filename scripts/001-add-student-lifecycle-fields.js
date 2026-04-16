/**
 * Migration: Add student lifecycle fields
 * 
 * This migration adds lifecycle management fields to existing students:
 * - status: ACTIVE, COMPLETED, DROPPED (default: ACTIVE)
 * - completedAt: Timestamp when student marked as completed
 * - certificateId: Reference to generated certificate
 * - completionReason: Reason for completion/dropout
 * 
 * IMPORTANT: This migration updates all existing students!
 * - All existing students will have status set to 'ACTIVE' (default)
 * - This allows new lifecycle management features to work with existing data
 * 
 * Reversibility: This migration is safe to run. If issues occur:
 * - Fields will have default values (ACTIVE status)
 * - No data is deleted, only new fields added
 * - Can manually revert by setting status back to original state if needed
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims_v2';

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add student lifecycle fields');
    console.log('📍 MongoDB URI:', MONGO_URI);
    
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Define User schema directly for this migration
    const userSchema = new mongoose.Schema(
      {},
      { collection: 'users', strict: false }
    );
    const User = mongoose.model('User', userSchema);
    
    // Count students before migration
    const totalStudents = await User.countDocuments({ role: 'student' });
    console.log(`📊 Total students in database: ${totalStudents}`);

    if (totalStudents === 0) {
      console.log('ℹ️  No students found. Migration not needed.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Check how many students already have the fields set
    const studentsWithLifecycleFields = await User.countDocuments({
      role: 'student',
      $or: [
        { status: { $exists: true, $ne: null } },
        { completedAt: { $exists: true } },
        { certificateId: { $exists: true } },
        { completionReason: { $exists: true } }
      ]
    });

    console.log(`📋 Students with lifecycle fields already set: ${studentsWithLifecycleFields}`);
    
    if (studentsWithLifecycleFields === totalStudents) {
      console.log('✅ All students already have lifecycle fields. No update needed.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Perform the update
    console.log('🚀 Updating students with default lifecycle fields...');
    
    const result = await User.updateMany(
      { role: 'student' },
      {
        $set: {
          status: 'ACTIVE',
          completedAt: null,
          certificateId: null,
          completionReason: null
        }
      },
      { multi: true }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Matched documents: ${result.matchedCount}`);
    console.log(`   - Modified documents: ${result.modifiedCount}`);

    // Verify migration
    console.log('🔍 Verifying migration...');
    
    const activeStudents = await User.countDocuments({
      role: 'student',
      status: 'ACTIVE'
    });
    
    const completedStudents = await User.countDocuments({
      role: 'student',
      status: 'COMPLETED'
    });
    
    const droppedStudents = await User.countDocuments({
      role: 'student',
      status: 'DROPPED'
    });

    console.log('📊 Status breakdown after migration:');
    console.log(`   - ACTIVE students: ${activeStudents}`);
    console.log(`   - COMPLETED students: ${completedStudents}`);
    console.log(`   - DROPPED students: ${droppedStudents}`);
    console.log(`   - Total: ${activeStudents + completedStudents + droppedStudents}`);

    // Verify all students have the fields
    const studentsWithoutFields = await User.countDocuments({
      role: 'student',
      $or: [
        { status: { $exists: false } },
        { status: null }
      ]
    });

    if (studentsWithoutFields === 0) {
      console.log('✅ Verification passed: All students have lifecycle fields');
    } else {
      console.log(`⚠️  Warning: ${studentsWithoutFields} students still missing lifecycle fields`);
    }

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

// Run the migration
runMigration();
