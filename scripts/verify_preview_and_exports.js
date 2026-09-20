const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');

async function run() {
    const outputDir = path.join(process.cwd(), 'scratch/verification_artifacts');
    fs.mkdirSync(outputDir, { recursive: true });

    console.log('=== Step 1: Launch Puppeteer and test responsive viewports ===');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:3000/mou.html', { waitUntil: 'networkidle0' });

    console.log('Capturing Desktop Step 1...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step1.png') });

    // Fill Step 1
    await page.type('#f-school', 'Delhi Public World School');
    await page.type('#f-city', 'Bhopal, MP');
    await page.type('#f-udise', '23260100101');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step1_filled.png') });

    // Advance to Step 2
    await page.click('#pane-step-1 .btn-primary');
    await new Promise(r => setTimeout(r, 400));
    console.log('Capturing Desktop Step 2...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step2.png') });

    // Fill Step 2
    await page.type('#f-principal', 'Dr. Rajeshwar Sharma');
    await page.type('#f-designation', 'Principal');
    await page.type('#f-email', 'principal@dpwsbhopal.edu.in');
    await page.type('#f-phone', '+91 98260 12345');

    // Advance to Step 3
    await page.click('#pane-step-2 .btn-primary');
    await new Promise(r => setTimeout(r, 400));
    console.log('Capturing Desktop Step 3...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step3.png') });

    // Fill Step 3
    await page.type('#f-students', '450');
    await page.evaluate(() => updateDoc());
    await new Promise(r => setTimeout(r, 200));

    // Advance to Step 4 (Review)
    await page.click('#pane-step-3 .btn-primary');
    await new Promise(r => setTimeout(r, 500));
    console.log('Capturing Desktop Step 4 (Review Document Sheet)...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step4_review.png') });

    // Precise screenshots of document pages in the preview
    const mouPage1El = await page.$('#mou-page-1');
    if (mouPage1El) {
        await mouPage1El.screenshot({ path: path.join(outputDir, 'preview_page1.png') });
    }
    const mouPage2El = await page.$('#mou-page-2');
    if (mouPage2El) {
        await mouPage2El.screenshot({ path: path.join(outputDir, 'preview_page2.png') });
    }
    const mouPage3El = await page.$('#mou-page-3');
    if (mouPage3El) {
        await mouPage3El.screenshot({ path: path.join(outputDir, 'preview_page3.png') });
    }

    // Advance to Step 5 (Sign & Download)
    await page.click('#pane-step-4 .btn-primary');
    await new Promise(r => setTimeout(r, 400));
    console.log('Capturing Desktop Step 5 before signing...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step5_before_sig.png') });

    // Draw signature on canvas
    console.log('Drawing signature on canvas...');
    const canvasEl = await page.$('#sigCanvas');
    const box = await canvasEl.boundingBox();
    
    await page.mouse.move(box.x + 50, box.y + 110);
    await page.mouse.down();
    const points = [
        [70, 80], [90, 130], [110, 70], [130, 120], [160, 90],
        [190, 110], [220, 80], [260, 120], [300, 90], [350, 110]
    ];
    for (const [px, py] of points) {
        await page.mouse.move(box.x + px, box.y + py, { steps: 5 });
    }
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 300));

    console.log('Capturing Desktop Step 5 after signing...');
    await page.screenshot({ path: path.join(outputDir, 'desktop_step5_signed.png') });

    // 2. Mobile Viewport (390x844) - iPhone 14 Pro
    console.log('Testing Mobile Viewport 390x844...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    
    await page.evaluate(() => goToStep(1));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(outputDir, 'mobile_390_step1.png') });

    await page.evaluate(() => goToStep(3));
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(outputDir, 'mobile_390_step3.png') });

    await page.evaluate(() => goToStep(4));
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outputDir, 'mobile_390_step4_reading.png') });

    await page.evaluate(() => goToStep(5));
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outputDir, 'mobile_390_step5.png') });

    // 3. Tablet Viewport (768x1024) - iPad
    console.log('Testing Tablet Viewport 768x1024...');
    await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await page.evaluate(() => goToStep(4));
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outputDir, 'tablet_768_step4.png') });

    // 4. Generate Exports (PDF and DOCX)
    console.log('Triggering PDF and DOCX downloads...');
    const exportResults = await page.evaluate(async () => {
        const payload = buildMouPayload();

        // 1. Fetch PDF
        const pdfRes = await fetch('/api/v1/mou/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const pdfBlob = await pdfRes.blob();
        const pdfBuffer = await pdfBlob.arrayBuffer();

        // 2. Fetch DOCX
        payload.filename = payload.docxFilename;
        const docxRes = await fetch('/api/v1/mou/docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const docxBlob = await docxRes.blob();
        const docxBuffer = await docxBlob.arrayBuffer();

        function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }

        return {
            pdfBase64: arrayBufferToBase64(pdfBuffer),
            docxBase64: arrayBufferToBase64(docxBuffer)
        };
    });

    const pdfPath = path.join(outputDir, 'generated_agreement.pdf');
    const docxPath = path.join(outputDir, 'generated_agreement.docx');
    fs.writeFileSync(pdfPath, Buffer.from(exportResults.pdfBase64, 'base64'));
    fs.writeFileSync(docxPath, Buffer.from(exportResults.docxBase64, 'base64'));
    console.log(`Saved generated PDF (${fs.statSync(pdfPath).size} bytes) to ${pdfPath}`);
    console.log(`Saved generated DOCX (${fs.statSync(docxPath).size} bytes) to ${docxPath}`);

    // 5. Convert generated DOCX to PDF via LibreOffice to render DOCX pages
    console.log('Converting generated DOCX to PDF via LibreOffice to render its pages...');
    const sofficeBinary = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    const tempDocxPath = path.join(outputDir, 'from_docx_master.docx');
    fs.copyFileSync(docxPath, tempDocxPath);
    execSync(`"${sofficeBinary}" --headless --convert-to pdf --outdir "${outputDir}" "${tempDocxPath}"`);
    const docxConvertedPdf = path.join(outputDir, 'from_docx_master.pdf');

    // 6. Render PDF pages to PNG using PDF.js inside Puppeteer
    console.log('Rendering PDF pages via PDF.js...');
    const renderPdfPages = async (targetPdfPath, prefix) => {
        const pdfBase64 = fs.readFileSync(targetPdfPath).toString('base64');
        const pdfViewerPage = await browser.newPage();
        await pdfViewerPage.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
        
        const viewerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; background: #525659; display: flex; flex-direction: column; align-items: center; gap: 20px; }
            canvas { background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          </style>
        </head>
        <body>
          <div id="canvases"></div>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            async function render(b64) {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
              window.__numPages = pdf.numPages;
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.id = 'canvas-page-' + i;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                document.getElementById('canvases').appendChild(canvas);
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              }
              window.__rendered = true;
            }
          </script>
        </body>
        </html>
        `;

        await pdfViewerPage.setContent(viewerHtml, { waitUntil: 'networkidle0' });
        await pdfViewerPage.evaluate((b64) => render(b64), pdfBase64);
        await pdfViewerPage.waitForFunction(() => window.__rendered === true, { timeout: 15000 });

        const numPages = await pdfViewerPage.evaluate(() => window.__numPages);
        console.log(`Rendered ${numPages} pages for ${prefix}`);

        for (let p = 1; p <= numPages; p++) {
            const canvasHandle = await pdfViewerPage.$(`#canvas-page-${p}`);
            if (canvasHandle) {
                const savePath = path.join(outputDir, `${prefix}_page${p}.png`);
                await canvasHandle.screenshot({ path: savePath });
                console.log(`Saved ${savePath}`);
            }
        }
        await pdfViewerPage.close();
    };

    await renderPdfPages(pdfPath, 'pdf_output');
    await renderPdfPages(docxConvertedPdf, 'docx_output');

    // 7. Check Fonts in PDF
    console.log('\n--- Checking embedded fonts in generated PDF ---');
    const pdfContent = fs.readFileSync(pdfPath).toString('latin1');
    const fontsFound = new Set([...pdfContent.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_-]+)/g)].map(m => m[1]));
    console.log('Fonts detected in PDF:', Array.from(fontsFound));

    await browser.close();
    console.log('\n=== All verifications completed successfully! ===');
}

run().catch(err => {
    console.error('Fatal verification error:', err);
    process.exit(1);
});
