const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define Schemas
const SessionSchema = new Schema({
    instituteId: Schema.Types.ObjectId,
    isActive: Boolean,
    sessionName: String,
    deletedAt: Date
});

const BatchSchema = new Schema({
    institute: Schema.Types.ObjectId,
    session: Schema.Types.ObjectId,
    name: String
});

const FeeSchema = new Schema({
    institute: Schema.Types.ObjectId,
    session: Schema.Types.ObjectId,
    batch: Schema.Types.ObjectId,
    student: Schema.Types.ObjectId
});

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);
const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
const Fee = mongoose.models.Fee || mongoose.model('Fee', FeeSchema);

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ims-v2');
        console.log('Connected to MongoDB');

        // 1. Fix Batches
        const batchesWithoutSession = await Batch.find({ 
            $or: [
                { session: { $exists: false } },
                { session: null }
            ]
        });

        console.log(`Found ${batchesWithoutSession.length} batches without session`);
        for (const batch of batchesWithoutSession) {
            const activeSession = await Session.findOne({
                instituteId: batch.institute,
                isActive: true,
                deletedAt: null
            });

            if (activeSession) {
                batch.session = activeSession._id;
                await batch.save();
                console.log(`Updated Batch: ${batch.name} (${batch._id}) with session: ${activeSession.sessionName}`);
            }
        }

        // 2. Fix Fees
        const feesWithoutSession = await Fee.find({
            $or: [
                { session: { $exists: false } },
                { session: null }
            ]
        });

        console.log(`Found ${feesWithoutSession.length} fees without session`);
        for (const fee of feesWithoutSession) {
            // Try to get session from batch
            if (fee.batch) {
                const batch = await Batch.findById(fee.batch);
                if (batch && batch.session) {
                    fee.session = batch.session;
                    await fee.save();
                    console.log(`Updated Fee for student ${fee.student} from Batch session`);
                    continue;
                }
            }

            // Fallback to active session for institute
            const activeSession = await Session.findOne({
                instituteId: fee.institute,
                isActive: true,
                deletedAt: null
            });

            if (activeSession) {
                fee.session = activeSession._id;
                await fee.save();
                console.log(`Updated Fee for student ${fee.student} with Active session: ${activeSession.sessionName}`);
            }
        }

        console.log('Migration completed');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
