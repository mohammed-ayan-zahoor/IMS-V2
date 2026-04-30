const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function cleanupSubmissions() {
    try {
        console.log("Starting Submissions Cleanup...");
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const Submission = mongoose.models.Submission || mongoose.model('Submission', new mongoose.Schema({
            file: { publicId: String },
            expiresAt: { type: Date, index: true }
        }));

        const now = new Date();
        
        // 1. Find expired submissions
        const expired = await Submission.find({ 
            expiresAt: { $lt: now } 
        });

        console.log(`Found ${expired.length} expired submissions.`);

        for (const sub of expired) {
            if (sub.file?.publicId) {
                console.log(`Deleting file from Cloudinary: ${sub.file.publicId}`);
                await cloudinary.uploader.destroy(sub.file.publicId);
            }
            await Submission.findByIdAndDelete(sub._id);
            console.log(`Deleted database record for submission: ${sub._id}`);
        }

        console.log("Cleanup completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup Error:", error);
        process.exit(1);
    }
}

cleanupSubmissions();
