const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const UserSchema = new mongoose.Schema({
    role: String,
    institute: mongoose.Schema.Types.ObjectId,
    activeSession: mongoose.Schema.Types.ObjectId,
    deletedAt: Date
});

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.models.User || mongoose.model("User", UserSchema);
        
        const instId = "69a68df50e2531d5827beb5c";
        const sessionId = "69f3503e303c4fb8d0ceb34c"; // 25-26 (Active)
        
        console.log(`Migrating students for institute ${instId} to session ${sessionId}...`);
        
        const result = await User.updateMany(
            { 
                institute: new mongoose.Types.ObjectId(instId), 
                role: "student",
                $or: [
                    { activeSession: { $exists: false } },
                    { activeSession: null }
                ]
            },
            { $set: { activeSession: new mongoose.Types.ObjectId(sessionId) } }
        );
        
        console.log(`Migration complete. Modified ${result.modifiedCount} students.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
