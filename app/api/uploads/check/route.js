import { NextResponse } from "next/server";
import { access, readdir } from "fs/promises";
import path from "path";

export async function GET(req) {
    try {
        const uploadDir = path.join(process.cwd(), "public/uploads");
        
        // Check if directory exists and is readable
        try {
            await access(uploadDir);
            const files = await readdir(uploadDir);
            
            return NextResponse.json({
                status: "ok",
                message: "Uploads directory is accessible",
                directory: uploadDir,
                fileCount: files.length,
                files: files.slice(0, 10) // Return first 10 files
            });
        } catch (err) {
            return NextResponse.json({
                status: "error",
                message: "Uploads directory not accessible",
                directory: uploadDir,
                error: err.message
            }, { status: 500 });
        }
    } catch (error) {
        console.error("Diagnostic error:", error);
        return NextResponse.json(
            { error: "Diagnostic check failed", message: error.message },
            { status: 500 }
        );
    }
}
