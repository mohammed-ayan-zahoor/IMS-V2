/**
 * Compute overdue fine for a library loan.
 * Pure function — no DB calls, easy to unit-test.
 *
 * @param {Date} dueDate
 * @param {Date} returnedAt  — actual return/lost date (use new Date() for "now")
 * @param {{ enabled: boolean, type: 'flat'|'daily', amount: number, offsetDays: number }} fineConfig
 * @returns {number} fine amount in ₹ (0 if not overdue or fines disabled)
 */
export function computeFine(dueDate, returnedAt, fineConfig) {
    if (!fineConfig?.enabled) return 0;
    const { type, amount, offsetDays } = fineConfig;

    // Grace window: dueDate + offsetDays
    const graceEnds = new Date(dueDate.getTime() + offsetDays * 86_400_000);
    if (returnedAt <= graceEnds) return 0;

    if (type === 'flat') return amount;

    // Daily: count days past due (not past grace end — offsetDays is a grace period, not a free period)
    const msOverdue = returnedAt.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(msOverdue / 86_400_000);
    const chargeableDays = Math.max(0, daysOverdue - offsetDays);
    return chargeableDays * amount;
}
