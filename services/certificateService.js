import puppeteer from 'puppeteer';
import path from 'path';

/**
 * Certificate Service - Handles on-demand certificate PDF generation
 * Generates PDFs on-the-fly without storing files on disk
 */

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
