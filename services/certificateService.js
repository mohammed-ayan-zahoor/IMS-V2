import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fetch from 'node-fetch';

/**
 * Certificate Service - Handles on-demand certificate PDF generation
 * Supports both HTML-based (legacy) and image-based (template) certificates
 * Generates PDFs on-the-fly without storing files on disk
 */

// Register bundled Google Fonts
const fontDir = path.join(process.cwd(), 'public', 'fonts');
const fonts = [
    { name: 'Roboto', path: path.join(fontDir, 'Roboto-Regular.ttf') },
    { name: 'Roboto Bold', path: path.join(fontDir, 'Roboto-Bold.ttf') },
    { name: 'Inter', path: path.join(fontDir, 'Inter-Regular.ttf') },
    { name: 'Lora', path: path.join(fontDir, 'Lora-Regular.ttf') },
    { name: 'Poppins', path: path.join(fontDir, 'Poppins-Regular.ttf') }
];

fonts.forEach(font => {
    try {
        if (fs.existsSync(font.path)) {
            registerFont(font.path, { family: font.name });
            if (process.env.NODE_ENV === 'development') {
                console.log(`✓ Registered font: ${font.name}`);
            }
        } else {
            console.warn(`⚠ Font file not found: ${font.path} - will use system fallback`);
        }
    } catch (error) {
        console.warn(`⚠ Could not register font ${font.name}: ${error.message} - will use system fallback`);
    }
});

/**
 * Builds font string for canvas context
 */
const buildFontString = (fontSize, fontWeight, fontStyle, fontFamily) => {
    const style = fontStyle === 'italic' ? 'italic ' : '';
    const weight = fontWeight === 'bold' ? 'bold ' : '';
    return `${style}${weight}${fontSize}px "${fontFamily}"`;
};

/**
 * Generates certificate PDF using image template with overlaid text
 */
export const generateCertificatePDFFromTemplate = async (certificateData, template) => {
    const {
        studentName,
        courseName,
        certificateNumber,
        issueDate,
        duration,
        grade,
        instituteName
    } = certificateData;

    const formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    try {
         // 1. Fetch the template image
         if (!template.imageUrl) {
             throw new Error('Template image URL is missing');
         }

         // Convert relative URLs to absolute URLs
         let absoluteImageUrl = template.imageUrl;
         if (template.imageUrl.startsWith('/')) {
             const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
             absoluteImageUrl = new URL(template.imageUrl, baseUrl).toString();
         }

         const imageResponse = await fetch(absoluteImageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch template image: ${imageResponse.statusText}`);
        }
        const imageBuffer = await imageResponse.buffer();
        const image = await loadImage(imageBuffer);

        // 2. Create canvas matching image dimensions
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        // Draw the template image
        ctx.drawImage(image, 0, 0);

        // 3. Reference width for scaling fonts (assumes 1000px reference)
        const referenceWidth = 1000;
        const scaleRatio = image.width / referenceWidth;

        // 4. Overlay text at placeholder positions
        const placeholders = template.placeholders;
        const dataMap = {
            studentName: { text: studentName, placeholder: placeholders.studentName },
            courseName: { text: courseName, placeholder: placeholders.courseName },
            issueDate: { text: formattedDate, placeholder: placeholders.issueDate },
            certificateNumber: { text: `Cert #${certificateNumber}`, placeholder: placeholders.certificateNumber },
            duration: { text: duration || '', placeholder: placeholders.duration },
            grade: { text: grade || '', placeholder: placeholders.grade },
            instituteName: { text: instituteName, placeholder: placeholders.instituteName }
        };

        Object.entries(dataMap).forEach(([key, { text, placeholder }]) => {
            if (!text || !placeholder?.enabled) return;

            const p = placeholder;
            const x = (p.x / 100) * image.width;
            const y = (p.y / 100) * image.height;
            
            // Scale font size relative to canvas width
            const scaledFontSize = Math.round((p.fontSize || 24) * scaleRatio);
            
            // Build and apply font
            const fontStr = buildFontString(scaledFontSize, p.fontWeight, p.fontStyle, p.fontFamily);
            ctx.font = fontStr;
            ctx.fillStyle = p.color || '#000000';
            ctx.textAlign = p.textAlign || 'center';
            
            // Draw text
            ctx.fillText(text, x, y);
        });

        // 5. Convert canvas to image buffer (PNG)
        const pngBuffer = canvas.toBuffer('image/png');

        // 6. Convert PNG to PDF using puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Convert PNG buffer to base64 data URL
        const base64Image = pngBuffer.toString('base64');
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <img src="data:image/png;base64,${base64Image}" />
            </body>
            </html>
        `;

        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            margin: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            }
        });

        await browser.close();

        return pdfBuffer;

    } catch (error) {
        console.error('Error generating certificate from template:', error);
        throw new Error(`Failed to generate certificate from template: ${error.message}`);
    }
};

export const generateCertificatePDF = async (certificateData) => {
    const {
        studentName,
        courseName,
        certificateNumber,
        issueDate,
        instituteName,
        duration
    } = certificateData;

    const formattedDate = new Date(issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Georgia', serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: #f5f5f5;
                    padding: 20px;
                }
                
                .certificate {
                    width: 1000px;
                    height: 700px;
                    background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
                    border: 3px solid #2c5aa0;
                    position: relative;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    padding: 60px;
                    text-align: center;
                    overflow: hidden;
                }
                
                .certificate::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 80px;
                    background: linear-gradient(90deg, #2c5aa0 0%, #3d7ec9 50%, #2c5aa0 100%);
                    opacity: 0.1;
                }
                
                .certificate-content {
                    position: relative;
                    z-index: 1;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                
                .header {
                    margin-bottom: 30px;
                }
                
                .certificate-title {
                    font-size: 48px;
                    font-weight: bold;
                    color: #2c5aa0;
                    margin-bottom: 10px;
                    letter-spacing: 2px;
                }
                
                .subtitle {
                    font-size: 18px;
                    color: #555;
                    font-style: italic;
                }
                
                .body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    margin: 20px 0;
                }
                
                .congratulations {
                    font-size: 20px;
                    color: #333;
                    margin-bottom: 20px;
                }
                
                .student-name {
                    font-size: 36px;
                    font-weight: bold;
                    color: #2c5aa0;
                    margin: 20px 0;
                    text-decoration: underline;
                    text-decoration-color: #2c5aa0;
                    text-decoration-thickness: 2px;
                    text-underline-offset: 8px;
                }
                
                .achievement-text {
                    font-size: 16px;
                    color: #555;
                    line-height: 1.6;
                    margin: 20px 0;
                    max-width: 800px;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                .course-info {
                    font-size: 18px;
                    color: #2c5aa0;
                    margin: 15px 0;
                    font-weight: 600;
                }
                
                .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #2c5aa0;
                }
                
                .signature-block {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .signature-line {
                    width: 120px;
                    border-top: 2px solid #333;
                    margin-bottom: 5px;
                }
                
                .signature-text {
                    font-size: 12px;
                    color: #555;
                }
                
                .certificate-number {
                    font-size: 12px;
                    color: #999;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 1px;
                }
                
                .date-issued {
                    font-size: 14px;
                    color: #555;
                }
                
                .institution-name {
                    font-size: 14px;
                    color: #2c5aa0;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .seal {
                    width: 60px;
                    height: 60px;
                    border: 2px solid #2c5aa0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: #2c5aa0;
                    margin: 0 auto;
                }
                
                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }
                    .certificate {
                        box-shadow: none;
                        margin: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="certificate-content">
                    <div class="header">
                        <div class="institution-name">${instituteName}</div>
                        <div class="certificate-title">Certificate of Completion</div>
                        <div class="subtitle">In Recognition of Achievement</div>
                    </div>
                    
                    <div class="body">
                        <div class="congratulations">This certificate is proudly presented to</div>
                        <div class="student-name">${studentName}</div>
                        
                        <div class="achievement-text">
                            for successfully completing the course
                        </div>
                        
                        <div class="course-info">${courseName}</div>
                        
                        ${duration ? `<div class="achievement-text">Duration: ${duration}</div>` : ''}
                    </div>
                    
                    <div class="footer">
                        <div>
                            <div class="institution-name">Director</div>
                            <div class="signature-block">
                                <div class="signature-line"></div>
                                <div class="signature-text">Authorized Signature</div>
                            </div>
                        </div>
                        
                        <div style="text-align: center;">
                            <div class="seal">✓</div>
                            <div class="certificate-number">Cert #${certificateNumber}</div>
                            <div class="date-issued">${formattedDate}</div>
                        </div>
                        
                        <div style="width: 120px;"></div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Set PDF options for standard certificate size
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            margin: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            }
        });

        await browser.close();

        return pdfBuffer;
    } catch (error) {
        console.error('Error generating certificate PDF:', error);
        throw new Error(`Failed to generate certificate PDF: ${error.message}`);
    }
};

/**
 * Generates certificate filename
 */
export const generateCertificateFilename = (certificateNumber, studentName) => {
    const timestamp = Date.now();
    const cleanName = studentName.replace(/\s+/g, '-').toLowerCase();
    return `certificate-${cleanName}-${certificateNumber}-${timestamp}.pdf`;
};
