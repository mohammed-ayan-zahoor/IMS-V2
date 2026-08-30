import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const primaryPath = path.join(process.cwd(), "public/downloads/student-app.apk");
        const secondaryPath = path.join(process.cwd(), "mobile/build/app/outputs/flutter-apk/app-release.apk");

        let filePath = null;
        if (fs.existsSync(primaryPath)) {
            filePath = primaryPath;
        } else if (fs.existsSync(secondaryPath)) {
            filePath = secondaryPath;
        }

        let mtimeMs = Date.now();
        let fileSize = 0;

        if (filePath) {
            const stats = fs.statSync(filePath);
            mtimeMs = Math.floor(stats.mtimeMs);
            fileSize = stats.size;
        }

        return NextResponse.json({
            version: "0.1.0+1",
            versionCode: 1,
            minVersionCode: 1,
            lastModified: mtimeMs,
            fileSize: fileSize,
            downloadUrl: "/api/v1/app/download",
            releaseNotes: "Performance improvements, instant notification sync, and bug fixes.",
            forceUpdate: false,
        });
    } catch (error) {
        console.error("App version check error:", error);
        return NextResponse.json({ error: "Failed to fetch version info" }, { status: 500 });
    }
}
