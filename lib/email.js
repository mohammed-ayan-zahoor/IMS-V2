import nodemailer from 'nodemailer';

function createTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

export async function sendWelcomeEmail({ to, contactName, instituteName, instituteCode, loginUrl, tempPassword }) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[Email] SMTP credentials not configured. Skipping welcome email for:', to);
        return false;
    }

    try {
        await transporter.sendMail({
            from: `"Quantech IMS" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject: `Welcome to IMS — Your Portal is Ready, ${contactName}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
                    <h2 style="color: #4f46e5;">Welcome to Quantech IMS!</h2>
                    <p>Hi <strong>${contactName}</strong>,</p>
                    <p>Your institute <strong>${instituteName}</strong> has been successfully set up on Quantech IMS.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #334155;">Your Login Credentials</h3>
                        <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                        <p style="margin: 5px 0;"><strong>Institute Code:</strong> <code style="background: #e2e8f0; padding: 2px 6px; borderRadius: 4px;">${instituteCode}</code></p>
                        <p style="margin: 5px 0;"><strong>Username / Email:</strong> ${to}</p>
                        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; borderRadius: 4px;">${tempPassword}</code></p>
                    </div>

                    <p style="color: #ef4444; font-weight: bold;">⚠️ Please log in and change your password immediately after first access.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #64748b; font-size: 12px;">This is an automated system email from Quantech IMS. Do not reply to this email.</p>
                </div>
            `
        });
        console.log('[Email] Welcome email sent successfully to:', to);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send welcome email:', error);
        return false;
    }
}

export async function sendCouponEmail({ to, schoolName, couponCode, pricePerSeat, validUntil }) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[Email] SMTP credentials not configured. Skipping coupon email for:', to);
        return false;
    }

    try {
        await transporter.sendMail({
            from: `"Quantech IMS" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject: `Your Exclusive IMS Discount Code — ${couponCode}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
                    <h2 style="color: #4f46e5;">Your Exclusive IMS Discount Code</h2>
                    <p>Hi,</p>
                    <p>As per your MOU agreement, here is your exclusive coupon code for <strong>${schoolName}</strong>:</p>
                    
                    <div style="text-align: center; margin: 30px 0; background: #f3f4f6; padding: 20px; border-radius: 8px;">
                        <h1 style="letter-spacing: 4px; color: #4f46e5; margin: 0; font-size: 32px;">${couponCode}</h1>
                    </div>

                    <p style="margin: 5px 0;"><strong>Price per Seat:</strong> ₹${pricePerSeat}</p>
                    <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${new Date(validUntil).toLocaleDateString('en-IN')}</p>

                    <p style="margin-top: 20px;">Use this code on our onboarding page to claim your discounted rate:</p>
                    <p><a href="${process.env.NEXTAUTH_URL || ''}/quantech" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Go to Onboarding</a></p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #64748b; font-size: 12px;">This is an automated system email from Quantech IMS.</p>
                </div>
            `
        });
        console.log('[Email] Coupon email sent successfully to:', to);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send coupon email:', error);
        return false;
    }
}
