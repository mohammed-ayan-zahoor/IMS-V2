import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Material from '@/models/Material';
import { getInstituteScope } from '@/middleware/instituteScope';

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params; // Next.js 15 Compatibility

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId && !scope.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        const query = { _id: id };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        // Atomic Increment
        const material = await Material.findOneAndUpdate(
            query,
            { $inc: { downloadCount: 1 } },
            { new: true }
        );

        if (!material) {
            return NextResponse.json({ error: "Material not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            url: material.file.url,
            downloadCount: material.downloadCount 
        });

    } catch (error) {
        console.error("Download Tracking Error:", error.message);
        return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
    }
}
