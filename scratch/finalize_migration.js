const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const UserSchema = new mongoose.Schema({
    role: String,
    institute: mongoose.Schema.Types.ObjectId,
    activeSession: mongoose.Schema.Types.ObjectId,
    activeSessions: [mongoose.Schema.Types.ObjectId],
    deletedAt: Date
});

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.models.User || mongoose.model("User", UserSchema);
        
        console.log("Finalizing migration: Ensuring activeSessions array is populated for all students...");
        
        // 1. Find students who have an activeSession but it is not in activeSessions array
        const students = await User.find({
            role: "student",
            activeSession: { $ne: null }
        });
        
        let count = 0;
        for (const student of students) {
            const currentSessionId = student.activeSession.toString();
            const historicalSessionIds = student.activeSessions.map(id => id.toString());
            
            if (!historicalSessionIds.includes(currentSessionId)) {
                student.activeSessions.push(student.activeSession);
                await student.save();
                count++;
            }
        }
        
        console.log(`Migration complete. Updated ${count} students.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
