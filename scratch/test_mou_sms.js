const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function sendTestSMS(mobileNumber) {
    const authKey = process.env.DEV_MSG91_AUTH_KEY;
    const templateId = process.env.DEV_MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
        console.error("Missing DEV_MSG91_AUTH_KEY or DEV_MSG91_TEMPLATE_ID in .env.local");
        return;
    }

    if (!mobileNumber) {
        console.error("Please provide a mobile number (with country code, e.g. 919876543210)");
        return;
    }

    const payload = {
        template_id: templateId,
        short_url: "0",
        recipients: [
            {
                mobiles: mobileNumber,
                message: "Test SMS content working"
            }
        ]
    };

    console.log("Sending MSG91 payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch("https://control.msg91.com/api/v5/flow/", {
            method: "POST",
            headers: {
                "authkey": authKey,
                "accept": "application/json",
                "content-type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("MSG91 Response:", data);
        
        if (data.type === "success") {
            console.log("✅ SMS successfully queued for delivery!");
        } else {
            console.error("❌ Failed to send SMS:", data.message);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

// Pass phone number as command line argument
const mobile = process.argv[2];
sendTestSMS(mobile);
