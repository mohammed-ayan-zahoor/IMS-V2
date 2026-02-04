import { connectDB } from './lib/mongodb.js';
import mongoose from 'mongoose';

async function run() {
    try {
        console.log("Connecting to DB...");
        await connectDB();

        console.log("Searching for 'test 4' in raw 'exams' collection...");
        // Use the native MongoDB driver collection
        const examsCollection = mongoose.connection.db.collection('exams');
        const exams = await examsCollection.find({ title: /test 4/i }).toArray();

        if (exams.length === 0) {
            console.log("No exam found with title 'test 4'");
        } else {
            console.log(`Found ${exams.length} exam(s).`);
            exams.forEach((exam, i) => {
                console.log(`\n--- Exam #${i + 1} ---`);
                console.log(`ID: ${exam._id}`);
                console.log(`Title: ${exam.title}`);
                console.log(`Status: ${exam.status}`);
                console.log(`Duration: ${exam.duration}`);

                // Inspect Schedule
                if (exam.schedule) {
                    console.log("Schedule Object:", JSON.stringify(exam.schedule, null, 2));

                    if (exam.schedule.startTime) console.log(`Start Time: ${exam.schedule.startTime} (Type: ${typeof exam.schedule.startTime})`);
                    if (exam.schedule.endTime) console.log(`End Time:   ${exam.schedule.endTime} (Type: ${typeof exam.schedule.endTime})`);
                } else {
                    console.log("!! NO SCHEDULE OBJECT !!");
                }

                console.log("Root scheduledAt:", exam.scheduledAt);
                console.log("Root endTime (if any):", exam.endTime);
            });
        }

        let exitCode = 0;

        async function run() {
            try {
                console.log("Connecting to DB...");
                // ... rest of try block
            } catch (error) {
                console.error("Error:", error);
                exitCode = 1;
            } finally {
                process.exit(exitCode);
            }
        }
    }

run();
