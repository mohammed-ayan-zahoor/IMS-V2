import mongoose from 'mongoose';

/**
 * Generate the next accession number for a library copy.
 * Format: {PREFIX}-{YEAR}-{000001}
 * Uses the same Counter upsert pattern as User.enrollmentNumber.
 *
 * @param {string|ObjectId} instituteId
 * @param {string} prefix  — from LibrarySettings.barcodePrefix (default 'LIB')
 * @returns {Promise<string>}
 */
export async function generateAccessionNumber(instituteId, prefix = 'LIB') {
    const year = new Date().getFullYear();
    const counterId = `lib_accession_${instituteId.toString()}_${year}`;
    const counter = await mongoose.model('Counter').findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `${prefix.toUpperCase()}-${year}-${String(counter.seq).padStart(6, '0')}`;
}
