import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import PusherServer from 'pusher';
import PushNotifications from '@pusher/push-notifications-server';

// Load environment variables
const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

const beamsInstanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
const beamsPrimaryKey = process.env.PUSHER_BEAMS_PRIMARY_KEY;

console.log("🚀 Initializing Notification Trigger Test...");

// 1. Trigger Pusher Real-Time WebSocket Channel Event
if (appId && key && secret) {
    const pusher = new PusherServer({ appId, key, secret, cluster, useTLS: true });

    const channel = process.argv[2] || 'transport-live-demo';
    const event = process.argv[3] || 'bus-location';
    const payload = {
        title: "🚌 IMS Live Transport Alert",
        message: "School Bus KA-01-AB-1234 is 2 minutes away from Stop A!",
        lat: 18.5204,
        lng: 73.8567,
        speed: 32,
        timestamp: new Date().toISOString()
    };

    pusher.trigger(channel, event, payload)
        .then(() => console.log(`✅ [WebSocket] Real-time event successfully sent to Channel: '${channel}' | Event: '${event}'`))
        .catch(err => console.error("❌ [WebSocket Error]:", err.message));
} else {
    console.warn("⚠️ Pusher WebSocket credentials missing in .env.local");
}

// 2. Trigger Pusher Beams Native Mobile & Web Push Notification
if (beamsInstanceId && beamsPrimaryKey) {
    const beamsClient = new PushNotifications({
        instanceId: beamsInstanceId,
        secretKey: beamsPrimaryKey,
    });

    const interest = process.argv[4] || 'global-announcements';

    beamsClient.publishToInterests([interest], {
        web: {
            notification: {
                title: "🔔 IMS Portal Announcement",
                body: "Live Attendance & Transport Tracking is now active on your device!",
                icon: "https://imsportal.3ftech.in/icon.png",
                deep_link: "https://imsportal.3ftech.in/student/dashboard"
            }
        },
        fcm: {
            notification: {
                title: "🚌 School Bus Alert",
                body: "Your child Arjun has boarded the school bus at Stop A."
            },
            data: {
                type: "transport_update",
                studentId: "12345"
            }
        }
    })
    .then((publishResponse) => {
        console.log(`✅ [Pusher Beams] Native Push Notification fired to interest '${interest}'! Publish ID:`, publishResponse.publishId);
    })
    .catch((error) => {
        console.error("❌ [Pusher Beams Error]:", error.message);
    });
} else {
    console.warn("⚠️ Pusher Beams credentials missing in .env.local");
}
