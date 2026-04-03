import User from '@/models/User';

/**
 * Roles that should receive admin chat notifications
 */
export const ADMIN_ROLES = ['admin', 'super_admin', 'instructor', 'staff'];

/**
 * Fetch roles for a list of recipient IDs
 * @param {string[]} recipientIds - Array of user ObjectIds as strings
 * @returns {Promise<Record<string, string>>} Map of userId -> role
 */
export async function getRecipientRoles(recipientIds) {
    if (!recipientIds || recipientIds.length === 0) {
        return {};
    }
    
    const recipients = await User.find({ _id: { $in: recipientIds } }).select('role');
    const roleMap = {};
    
    for (const recipient of recipients) {
        roleMap[recipient._id.toString()] = recipient.role;
    }
    
    return roleMap;
}

/**
 * Build a push notification payload for a specific role
 * @param {{ chatTitle: string, text: string, isBatch: boolean, senderName: string, role: string }} opts
 * @returns {Object} Notification payload for PushNotifications
 */
export function buildPayload({ chatTitle, text, isBatch, senderName, role }) {
    // Determine deep link based on role
    const isAdminRole = ADMIN_ROLES.includes(role);
    const deepLink = `${process.env.NEXTAUTH_URL}/${isAdminRole ? 'admin' : 'student'}/chat`;
    
    return {
        web: {
            notification: {
                title: chatTitle,
                body: `${isBatch ? `${senderName}: ` : ''}${text.substring(0, 100)}`,
                deep_link: deepLink,
                icon: `${process.env.NEXTAUTH_URL}/icon.png`,
            }
        }
    };
}