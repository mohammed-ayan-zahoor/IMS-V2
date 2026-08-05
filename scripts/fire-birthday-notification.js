import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import PushNotifications from '@pusher/push-notifications-server';
import PusherServer from 'pusher';

const beamsInstanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
const beamsPrimaryKey = process.env.PUSHER_BEAMS_PRIMARY_KEY;

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

const studentName = process.argv[2] || "Arjun";
const interest = process.argv[3] || "global-announcements";

console.log(`🎂 Firing Birthday Push Notification for '${studentName}'...`);

// 1. Pusher Beams Native Mobile & Web Push
if (beamsInstanceId && beamsPrimaryKey) {
    const beamsClient = new PushNotifications({
        instanceId: beamsInstanceId,
        secretKey: beamsPrimaryKey,
    });

    const title = `🎂 Happy Birthday, ${studentName}!`;
    const body = `Happy Birthday ${studentName}! Wishing you a wonderful day filled with joy and success from all of us at your Institute! 🎉🎈`;

    beamsClient.publishToInterests([interest], {
        web: {
            notification: {
                title,
                body,
                icon: "https://imsportal.3ftech.in/icon.png",
                deep_link: "https://imsportal.3ftech.in/student/dashboard"
            }
        },
        fcm: {
            notification: {
                title,
                body
            },
            data: {
                type: "birthday",
                studentName
            }
        }
    })
    .then((res) => {
        console.log(`✅ [Pusher Beams] Native Birthday Push sent! Publish ID: ${res.publishId}`);
    })
    .catch((err) => {
        console.error("❌ [Pusher Beams Error]:", err.message);
    });
}

// 2. Pusher Channels Real-Time Popup Trigger
if (appId && key && secret) {
    const pusher = new PusherServer({ appId, key, secret, cluster, useTLS: true });
    pusher.trigger("global-notifications", "birthday-alert", {
        title: `🎂 Happy Birthday, ${studentName}!`,
        message: `Wishing ${studentName} a very Happy Birthday! 🎉`,
        studentName,
        timestamp: new Date().toISOString()
    })
    .then(() => console.log(`✅ [WebSocket] Real-time Birthday alert sent to 'global-notifications' channel!`))
    .catch((err) => console.error("❌ [WebSocket Error]:", err.message));
}
