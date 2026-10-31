import Notification from "@/models/Notification";
import Batch from "@/models/Batch";
import { getBeamsInstance } from "@/lib/pusher";

/**
 * Dispatches Push (via Pusher Beams) and In-App (via Mongo Notification) to target users
 */
export async function sendNotification({
    instituteId,
    recipientIds = [],
    recipientRole = null,
    title,
    message,
    type = "ASSIGNMENT",
    link = "/student/assignments",
    metadata = {}
}) {
    try {
        if (!instituteId || (!recipientIds.length && !recipientRole)) return;

        // 1. Create In-App Notification(s) in DB
        if (recipientIds.length > 0) {
            const docs = recipientIds.map(uid => ({
                institute: instituteId,
                recipient: uid,
                recipientRole: recipientRole || "student",
                title,
                message,
                type,
                link,
                metadata,
                read: false,
                createdAt: new Date()
            }));
            await Notification.insertMany(docs);
        } else if (recipientRole) {
            await Notification.create({
                institute: instituteId,
                recipientRole,
                title,
                message,
                type,
                link,
                metadata,
                read: false,
                createdAt: new Date()
            });
        }

        // 2. Dispatch Push Notification via Pusher Beams (if users specified)
        if (recipientIds.length > 0) {
            const beamsClient = await getBeamsInstance(instituteId);
            if (beamsClient) {
                const userStringIds = recipientIds.map(id => id.toString());
                const rawUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imsportal.3ftech.in";
                const baseUrl = rawUrl.replace(/\/+$/, '');

                const payload = {
                    apns: {
                        aps: {
                            alert: {
                                title,
                                body: message
                            },
                            sound: "default"
                        }
                    },
                    fcm: {
                        data: {
                            title,
                            body: message,
                            type: type.toLowerCase(),
                            link: link || "",
                            metadata: JSON.stringify(metadata || {})
                        },
                        priority: "high"
                    },
                    web: {
                        notification: {
                            title,
                            body: message,
                            deep_link: `${baseUrl}${link}`
                        }
                    }
                };

                // Beams publishToUsers accepts batches up to 100 users
                for (let i = 0; i < userStringIds.length; i += 90) {
                    const chunk = userStringIds.slice(i, i + 90);
                    await beamsClient.publishToUsers(chunk, payload).catch(err => {
                        console.warn("[Beams Dispatch Error]:", err.message);
                    });
                }
            }
        }
    } catch (err) {
        console.error("[Notification Dispatch Error]:", err);
    }
}

/**
 * Finds all enrolled student user IDs in given batches or courses
 */
export async function getStudentIdsForMaterial({ courses = [], batches = [], instituteId }) {
    try {
        const query = { institute: instituteId, status: 'active' };
        if (batches.length > 0) {
            query._id = { $in: batches };
        } else if (courses.length > 0) {
            query.$or = [
                { course: { $in: courses } },
                { courseBundle: { $in: courses } }
            ];
        } else {
            return [];
        }

        const activeBatches = await Batch.find(query).select('enrolledStudents');
        const studentIdSet = new Set();

        for (const b of activeBatches) {
            if (Array.isArray(b.enrolledStudents)) {
                for (const enroll of b.enrolledStudents) {
                    if (enroll.status === 'active' && enroll.student) {
                        studentIdSet.add(enroll.student.toString());
                    }
                }
            }
        }

        return Array.from(studentIdSet);
    } catch (err) {
        console.error("[getStudentIdsForMaterial Error]:", err);
        return [];
    }
}
