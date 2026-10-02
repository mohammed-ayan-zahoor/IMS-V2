import connectDB from '@/lib/db';
import Institute from '@/models/Institute';
import Membership from '@/models/Membership';
import ApprovalRequest from '@/models/ApprovalRequest';

/**
 * Checks whether an action requires Master Admin approval.
 * ponytail: returns { proceed: true } when no gate applies or user is master admin.
 * If gated, creates a pending ApprovalRequest and returns { proceed: false, requestId, alreadyPending }.
 */
export async function checkApproval({ session, action, resourceType, resourceId, payload }) {
    if (!session?.user?.institute?.id) {
        return { proceed: true };
    }

    const instituteId = session.user.institute.id;
    const userId = session.user.id;

    await connectDB();

    // 1. Check if action is gated
    // 'approval_settings' is always gated if a master admin exists
    let isGated = false;
    if (action === 'approval_settings') {
        isGated = true;
    } else {
        const institute = await Institute.findById(instituteId).select('settings.approvalRules');
        isGated = !!(institute?.settings?.approvalRules?.[action]);
    }

    if (!isGated) {
        return { proceed: true };
    }

    // 2. Check if a master admin exists for this institute
    const masterMembership = await Membership.findOne({
        institute: instituteId,
        isMasterAdmin: true,
        isActive: true
    });

    if (!masterMembership) {
        // Fallback: no master admin assigned, proceed without blocking
        return { proceed: true };
    }

    // 3. If requester is the master admin (or super_admin), they self-approve
    if (masterMembership.user.toString() === userId.toString() || session.user.role === 'super_admin') {
        return { proceed: true };
    }

    // 4. Duplicate pending check (for resource-specific actions)
    if (resourceId) {
        const existingPending = await ApprovalRequest.findOne({
            institute: instituteId,
            action,
            resourceType,
            resourceId,
            status: 'pending'
        });

        if (existingPending) {
            return {
                proceed: false,
                alreadyPending: true,
                requestId: existingPending._id.toString()
            };
        }
    }

    // 5. Create new pending ApprovalRequest
    const request = await ApprovalRequest.create({
        institute: instituteId,
        requestedBy: userId,
        action,
        resourceType,
        resourceId: resourceId || undefined,
        payload,
        status: 'pending'
    });

    return {
        proceed: false,
        alreadyPending: false,
        requestId: request._id.toString()
    };
}
