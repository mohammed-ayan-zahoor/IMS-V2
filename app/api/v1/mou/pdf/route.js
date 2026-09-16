import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export async function POST(req) {
    let browser = null;
    try {
        const body = await req.json();
        const { html, filename } = body;

        if (!html || typeof html !== 'string') {
            return NextResponse.json({ error: "Document HTML is required" }, { status: 400 });
        }

        // In-line /assets/... images into base64 data URLs for instant local rendering
        let processedHtml = html.replace(/src=["']\/assets\/([^"']+)["']/g, (match, assetName) => {
            try {
                const filePath = path.join(process.cwd(), 'public', 'assets', assetName);
                if (fs.existsSync(filePath)) {
                    const ext = path.extname(assetName).replace('.', '').toLowerCase();
                    const mime = ext === 'png' ? 'image/png' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
                    const b64 = fs.readFileSync(filePath).toString('base64');
                    return `src="data:${mime};base64,${b64}"`;
                }
            } catch (err) {
                console.warn(`Could not inline asset ${assetName}:`, err);
            }
            return match;
        });

        // Launch headless browser to render 100% real text/vector PDF
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=medium'
            ]
        });

        const page = await browser.newPage();

        // ponytail: SSRF protection in Puppeteer. Intercept requests to block internal network and file access
        await page.setRequestInterception(true);
        page.on('request', (interceptedReq) => {
            try {
                const parsed = new URL(interceptedReq.url());
                const proto = parsed.protocol.toLowerCase();
                const hostname = parsed.hostname.toLowerCase();

                // Block local file / system schemes
                if (proto === 'file:' || proto === 'about:' || proto === 'chrome:') {
                    return interceptedReq.abort();
                }

                // Block loopback, cloud metadata (169.254.169.254), private IP ranges, and internal hostnames
                const blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
                if (
                    blockedHosts.includes(hostname) ||
                    hostname.endsWith('.localhost') ||
                    hostname.endsWith('.internal') ||
                    hostname.startsWith('10.') ||
                    hostname.startsWith('192.168.') ||
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
                ) {
                    return interceptedReq.abort();
                }

                if (proto === 'http:' || proto === 'https:' || proto === 'data:') {
                    return interceptedReq.continue();
                }

                return interceptedReq.abort();
            } catch {
                return interceptedReq.abort();
            }
        });

        // Emulate print media so @media print CSS rules format the pages perfectly
        await page.emulateMediaType('print');
        await page.setContent(processedHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '12mm',
                bottom: '12mm',
                left: '15mm',
                right: '15mm'
            }
        });

        await browser.close();
        browser = null;

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'MOU.pdf')}"`,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error("MOU PDF generation error:", error);
        if (browser) {
            try { await browser.close(); } catch (e) { /* ignore */ }
        }
        return NextResponse.json({ error: "Failed to generate proper PDF: " + error.message }, { status: 500 });
    }
}
