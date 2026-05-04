import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import Session from "@/models/Session";
import { StudentService } from "@/services/studentService";
import User from "@/models/User";

export async function GET(req) {
    try {
        await connectDB();
        
        // 1. Find the test institute
        const institute = await Institute.findOne({ code: 'TEST' });
        if (!institute) {
            return NextResponse.json({ error: "Institute 'TEST' not found" }, { status: 404 });
        }
        
        // 2. Find the current session for this institute
        const activeSession = await Session.findOne({ instituteId: institute._id, isActive: true });
        if (!activeSession) {
            return NextResponse.json({ error: "No active session found" }, { status: 404 });
        }
        
        // 3. Find an admin user
        const admin = await User.findOne({ institute: institute._id, role: 'admin' });
        const actorId = admin ? admin._id : null;
        
        const mockStudents = [
            {
                email: 'student1@test.com',
                profile: { firstName: 'Aarav', lastName: 'Sharma', gender: 'Male' },
                institute: institute._id
            },
            {
                email: 'student2@test.com',
                profile: { firstName: 'Diya', lastName: 'Patel', gender: 'Female' },
                institute: institute._id
            },
            {
                email: 'student3@test.com',
                profile: { firstName: 'Ishaan', lastName: 'Gupta', gender: 'Male' },
                institute: institute._id
            }
        ];
        
        const results = [];
        for (const data of mockStudents) {
            const student = await StudentService.createStudent(data, actorId, activeSession._id);
            results.push({ name: `${student.profile.firstName} ${student.profile.lastName}`, email: student.email });
        }
        
        return NextResponse.json({ success: true, seeded: results });
    } catch (error) {
        console.error("Seeding Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
