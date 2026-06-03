import mongoose from 'mongoose';
import { decryptSecret } from '../lib/crypto.js';
import Institute from '../models/Institute.js';

export class NotificationService {
    /**
     * Send dynamic SMS for a specific tenant/institute
     * @param {string} instituteId - Mongoose ObjectId of the Institute
     * @param {string} to - Recipient phone number (with country code, e.g., +919876543210)
     * @param {string} message - Message text body
     */
    static async sendSMS(instituteId, to, message) {
        if (!instituteId) {
            throw new Error('Institute context is required to send notification.');
        }

        // 1. Fetch the institute notifications credentials
        let config = {};
        if (mongoose.Types.ObjectId.isValid(instituteId)) {
            try {
                const inst = await Institute.findById(instituteId).select('notifications');
                if (inst && inst.notifications) {
                    config = inst.notifications;
                }
            } catch (err) {
                console.log(`[SMS DB WARNING] Could not fetch institute configurations: ${err.message}`);
            }
        }

        const provider = config.smsProvider || process.env.DEV_SMS_PROVIDER || 'mock';

        console.log(`[SMS DISPATCH] Triggering SMS to ${to} via provider "${provider}" for Institute: ${instituteId}`);

        switch (provider) {
            case 'twilio': {
                if (!config.twilioSid || !config.twilioToken || !config.twilioNumber) {
                    throw new Error('Twilio SMS credentials are incomplete.');
                }

                // Decrypt credentials in-memory
                const sid = decryptSecret(config.twilioSid);
                const token = decryptSecret(config.twilioToken);
                
                // Call Twilio REST API natively via global fetch
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
                const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        From: config.twilioNumber,
                        To: to,
                        Body: message
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Twilio native send failed.');
                }

                return { success: true, provider: 'twilio', sid: data.sid };
            }

            case 'msg91': {
                const authKeyEncrypted = config.msg91AuthKey || process.env.DEV_MSG91_AUTH_KEY;
                const senderId = config.msg91SenderId || process.env.DEV_MSG91_SENDER_ID;
                const templateId = config.msg91TemplateId || process.env.DEV_MSG91_TEMPLATE_ID;

                if (!authKeyEncrypted || !senderId) {
                    throw new Error('Msg91 SMS credentials are incomplete.');
                }

                const authKey = authKeyEncrypted.includes(':') 
                    ? decryptSecret(authKeyEncrypted) 
                    : authKeyEncrypted;

                const cleanTo = to.replace(/^\+/, '');

                if (templateId) {
                    // Call Msg91 Flow API natively via global fetch
                    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
                        method: 'POST',
                        headers: { 
                            'authkey': authKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            flow_id: templateId,
                            sender: senderId,
                            recipients: [{ mobiles: cleanTo, message: message }]
                        })
                    });
                    
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || 'Msg91 Flow API send failed.');
                    }
                    return { success: true, provider: 'msg91', data };
                } else {
                    // Fallback to Msg91 standard transactional SMS send via native fetch
                    const response = await fetch('https://control.msg91.com/api/v5/sms/send', {
                        method: 'POST',
                        headers: { 
                            'authkey': authKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sender: senderId,
                            route: '4', // Transactional route
                            sms: [{ message: message, to: [cleanTo] }]
                        })
                    });

                    const data = await response.json();
                    console.log("[Msg91 Raw Response]", { status: response.status, data });
                    if (!response.ok || data.type === 'error') {
                        throw new Error(data.message || 'Msg91 transactional send failed.');
                    }
                    return { success: true, provider: 'msg91', data };
                }
            }

            case 'mock':
            default: {
                console.log(`\n========================================\n[MOCK SMS SEND] SUCCESS\nTo: ${to}\nMessage: "${message}"\n========================================\n`);
                return { success: true, provider: 'mock', messageId: 'mock-sms-' + Date.now() };
            }
        }
    }

    /**
     * Send dynamic WhatsApp message for a specific tenant/institute
     */
    static async sendWhatsApp(instituteId, to, templateName, languageCode = 'en', variables = []) {
        if (!instituteId) {
            throw new Error('Institute context is required to send notification.');
        }

        const inst = await Institute.findById(instituteId).select('notifications');
        if (!inst || !inst.notifications) {
            throw new Error('School notification settings are not configured.');
        }

        const config = inst.notifications;
        const provider = config.whatsappProvider || 'mock';

        console.log(`[WA DISPATCH] Triggering WhatsApp template "${templateName}" to ${to} via "${provider}"`);

        switch (provider) {
            case 'twilio': {
                if (!config.twilioSid || !config.twilioToken || !config.twilioNumber) {
                    throw new Error('Twilio WhatsApp credentials are incomplete.');
                }

                const sid = decryptSecret(config.twilioSid);
                const token = decryptSecret(config.twilioToken);
                
                const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
                const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');

                // Twilio requires WhatsApp numbers prefixed with "whatsapp:"
                const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
                const formattedFrom = config.twilioNumber.startsWith('whatsapp:') ? config.twilioNumber : `whatsapp:${config.twilioNumber}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        From: formattedFrom,
                        To: formattedTo,
                        Body: `Your template: ${templateName} is ready with variables: ${variables.join(', ')}`
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Twilio WhatsApp native send failed.');
                }

                return { success: true, provider: 'twilio', sid: data.sid };
            }

            case 'meta': {
                if (!config.metaPhoneNumberId || !config.metaAccessToken) {
                    throw new Error('Meta WhatsApp Cloud credentials are incomplete.');
                }

                const accessToken = decryptSecret(config.metaAccessToken);
                const url = `https://graph.facebook.com/v17.0/${config.metaPhoneNumberId}/messages`;

                const components = variables.length > 0 ? [{
                    type: 'body',
                    parameters: variables.map(v => ({ type: 'text', text: String(v) }))
                }] : [];

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${accessToken}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: to,
                        type: 'template',
                        template: {
                            name: templateName,
                            language: { code: languageCode },
                            components: components
                        }
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error?.message || 'Meta WhatsApp native send failed.');
                }

                return { success: true, provider: 'meta', data };
            }

            case 'mock':
            default: {
                console.log(`\n========================================\n[MOCK WHATSAPP TEMPLATE] SUCCESS\nTo: ${to}\nTemplate: "${templateName}"\nLanguage: "${languageCode}"\nVariables: [${variables.join(', ')}]\n========================================\n`);
                return { success: true, provider: 'mock', messageId: 'mock-wa-' + Date.now() };
            }
        }
    }
}