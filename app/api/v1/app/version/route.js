import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const candidatePaths = [
            path.join(process.cwd(), "public/downloads/student-app.apk"),
            path.join(process.cwd(), "mobile/build/app/outputs/flutter-apk/app-release.apk")
        ];

        let filePath = null;
        let newestMtime = -1;
        let fileSize = 0;

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                const stats = fs.statSync(p);
                if (stats.mtimeMs > newestMtime) {
                    newestMtime = stats.mtimeMs;
                    filePath = p;
                    fileSize = stats.size;
                }
            }
        }

        let mtimeMs = newestMtime > 0 ? Math.floor(newestMtime) : Date.now();

        // Dynamically resolve version from mobile/pubspec.yaml if present
        let version = "0.1.0+5";
        let versionCode = 5;
        try {
            const pubspecPath = path.join(process.cwd(), "mobile/pubspec.yaml");
            if (fs.existsSync(pubspecPath)) {
                const content = fs.readFileSync(pubspecPath, "utf8");
                const match = content.match(/^version:\s*([^\s]+)/m);
                if (match) {
                    version = match[1];
                    const codeMatch = version.match(/\+(\d+)$/);
                    if (codeMatch) {
                        versionCode = parseInt(codeMatch[1], 10);
                    }
                }
            }
        } catch (_) {}

        const sizeMb = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(1) : "72.1";

        return NextResponse.json({
            version,
            versionCode,
            minVersionCode: 1,
            lastModified: mtimeMs,
            fileSize: fileSize,
            fileSizeFormatted: `${sizeMb} MB`,
            downloadUrl: "/api/v1/app/download",
            releaseNotes: "Latest student app with native in-app Razorpay checkout, student photo avatar, and performance optimizations.",
            forceUpdate: false,
        });
    } catch (error) {
        console.error("App version check error:", error);
        return NextResponse.json({ error: "Failed to fetch version info" }, { status: 500 });
    }
}
