import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

async function debug() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const users = await mongoose.connection.db.collection('users').find({ deletedAt: null }).toArray();
    console.log(`Total active users: ${users.length}`);

    const roles = {};
    users.forEach(u => {
        roles[u.role] = (roles[u.role] || 0) + 1;
    });
    console.log("Roles breakdown:", roles);

    const institutes = await mongoose.connection.db.collection('institutes').find({}).toArray();
    console.log(`Total institutes: ${institutes.length}`);
    institutes.forEach(i => console.log(`- ${i.name} (${i.code}): ${i._id}`));

    console.log("\nSample User (Student):");
    const student = users.find(u => u.role === 'student');
    console.log(JSON.stringify(student, null, 2));

    console.log("\nSample User (Admin):");
    const admin = users.find(u => u.role === 'admin');
    console.log(JSON.stringify(admin, null, 2));

    const memberships = await mongoose.connection.db.collection('memberships').find({}).toArray();
    console.log(`\nTotal memberships: ${memberships.length}`);

    await mongoose.disconnect();
}

debug();
