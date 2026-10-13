import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
    try {
        const candidatePaths = [
            path.join(process.cwd(), "public/downloads/student-app.apk"),
            path.join(process.cwd(), "mobile/build/app/outputs/flutter-apk/app-release.apk")
        ];

        let filePath = null;
        let newestMtime = -1;

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                const stats = fs.statSync(p);
                if (stats.mtimeMs > newestMtime) {
                    newestMtime = stats.mtimeMs;
                    filePath = p;
                }
            }
        }

        if (!filePath) {
            return NextResponse.json(
                { error: "APK file not found. Please build the release APK first." },
                { status: 404 }
            );
        }

        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        return new NextResponse(fileStream, {
            headers: {
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": 'attachment; filename="student-app-release.apk"',
                "Content-Length": stats.size.toString(),
            },
        });
    } catch (error) {
        console.error("APK Download API Error:", error);
        return NextResponse.json({ error: "Failed to download APK file" }, { status: 500 });
    }
}
