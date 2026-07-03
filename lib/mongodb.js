import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      console.log('=> MongoDB Connected');
      
      // Self-healing database migration: Drop legacy unique indexes if present
      try {
        const subjectsCol = mongooseInstance.connection.collection('subjects');
        const subjectsIndexes = await subjectsCol.indexes();
        const hasLegacySubjectsIndex = subjectsIndexes.some(idx => idx.name === 'institute_1_code_1');
        if (hasLegacySubjectsIndex) {
          console.log('=> Self-Healing Migration: Dropping legacy subjects index "institute_1_code_1"...');
          await subjectsCol.dropIndex('institute_1_code_1');
          console.log('=> Self-Healing Migration: Legacy index dropped successfully!');
        }

        const feesCol = mongooseInstance.connection.collection('fees');
        const feesIndexes = await feesCol.indexes();
        const hasLegacyFeesIndex = feesIndexes.some(idx => idx.name === 'institute_1_student_1_batch_1');
        if (hasLegacyFeesIndex) {
          console.log('=> Self-Healing Migration: Dropping legacy fees index "institute_1_student_1_batch_1"...');
          await feesCol.dropIndex('institute_1_student_1_batch_1');
          console.log('=> Self-Healing Migration: Legacy fees index dropped successfully!');
        }
      } catch (err) {
        console.error('=> Self-Healing Migration Error:', err.message);
      }

      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export { connectDB };
