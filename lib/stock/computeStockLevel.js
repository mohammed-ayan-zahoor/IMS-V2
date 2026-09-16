import mongoose from 'mongoose';
import StockTransaction from '@/models/StockTransaction';
import StockTransfer from '@/models/StockTransfer';
import Item from '@/models/Item';
import StockLocation from '@/models/StockLocation';

/**
 * Computes opening, closing, and current stock on hand for consumable items.
 * Uses append-only math from StockTransaction and StockTransfer.
 */

// Helper to convert date string "YYYY-MM-DD" into IST day boundaries
function getISTDayBoundaries(dateStr) {
    const targetDate = dateStr || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const startOfDay = new Date(`${targetDate}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999+05:30`);
    return { targetDate, startOfDay, endOfDay };
}

/**
 * Computes current stock-on-hand for an item across all locations,
 * or at a specific location if locationId is given.
 */
export async function getStockOnHand({ instituteId, itemId, locationId = null }) {
    const instId = new mongoose.Types.ObjectId(instituteId);
    const itmId = new mongoose.Types.ObjectId(itemId);
    const locId = locationId ? new mongoose.Types.ObjectId(locationId) : null;

    // 1. Transactions aggregate
    const txMatch = {
        institute: instId,
        item: itmId
    };
    if (locId) txMatch.location = locId;

    const txAgg = await StockTransaction.aggregate([
        { $match: txMatch },
        {
            $group: {
                _id: '$location',
                totalIn: {
                    $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$quantity', 0] }
                },
                totalOut: {
                    $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$quantity', 0] }
                }
            }
        }
    ]);

    // 2. Transfers aggregate (transfers out of location, transfers into location)
    let transferToAgg = [];
    let transferFromAgg = [];

    if (locId) {
        transferToAgg = await StockTransfer.aggregate([
            { $match: { institute: instId, item: itmId, toLocation: locId } },
            { $group: { _id: '$toLocation', total: { $sum: '$quantity' } } }
        ]);
        transferFromAgg = await StockTransfer.aggregate([
            { $match: { institute: instId, item: itmId, fromLocation: locId } },
            { $group: { _id: '$fromLocation', total: { $sum: '$quantity' } } }
        ]);
    } else {
        transferToAgg = await StockTransfer.aggregate([
            { $match: { institute: instId, item: itmId } },
            { $group: { _id: '$toLocation', total: { $sum: '$quantity' } } }
        ]);
        transferFromAgg = await StockTransfer.aggregate([
            { $match: { institute: instId, item: itmId } },
            { $group: { _id: '$fromLocation', total: { $sum: '$quantity' } } }
        ]);
    }

    // Build map of stock by location
    const locationMap = new Map();
    for (const r of txAgg) {
        const idStr = String(r._id);
        const current = locationMap.get(idStr) || { in: 0, out: 0, net: 0 };
        current.in += r.totalIn;
        current.out += r.totalOut;
        locationMap.set(idStr, current);
    }

    for (const r of transferToAgg) {
        const idStr = String(r._id);
        const current = locationMap.get(idStr) || { in: 0, out: 0, net: 0 };
        current.in += r.total;
        locationMap.set(idStr, current);
    }

    for (const r of transferFromAgg) {
        const idStr = String(r._id);
        const current = locationMap.get(idStr) || { in: 0, out: 0, net: 0 };
        current.out += r.total;
        locationMap.set(idStr, current);
    }

    let totalStock = 0;
    const byLocation = [];
    for (const [locKey, data] of locationMap.entries()) {
        const net = data.in - data.out;
        totalStock += net;
        byLocation.push({
            locationId: locKey,
            in: data.in,
            out: data.out,
            netStock: net
        });
    }

    if (locId) {
        const locData = locationMap.get(String(locId));
        return {
            totalStock: locData ? locData.in - locData.out : 0,
            byLocation
        };
    }

    return {
        totalStock,
        byLocation
    };
}

/**
 * Computes current stock on hand for ALL consumable items of an institute.
 * Highly efficient batch aggregation.
 */
export async function getAllConsumableStockSummary(instituteId) {
    const instId = new mongoose.Types.ObjectId(instituteId);

    const [txSummary, transfersToSummary, transfersFromSummary, items] = await Promise.all([
        StockTransaction.aggregate([
            { $match: { institute: instId } },
            {
                $group: {
                    _id: { item: '$item', location: '$location' },
                    totalIn: { $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$quantity', 0] } },
                    totalOut: { $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$quantity', 0] } }
                }
            }
        ]),
        StockTransfer.aggregate([
            { $match: { institute: instId } },
            {
                $group: {
                    _id: { item: '$item', location: '$toLocation' },
                    total: { $sum: '$quantity' }
                }
            }
        ]),
        StockTransfer.aggregate([
            { $match: { institute: instId } },
            {
                $group: {
                    _id: { item: '$item', location: '$fromLocation' },
                    total: { $sum: '$quantity' }
                }
            }
        ]),
        Item.find({ institute: instId, trackingType: 'consumable', isActive: true })
            .populate('category', 'name')
            .populate('defaultLocation', 'name code')
            .sort({ name: 1 })
            .lean()
    ]);

    // Map by `${itemId}_${locationId}` and also `${itemId}`
    const itemTotalMap = new Map();
    const itemLocationMap = new Map();

    const addStock = (itemId, locationId, deltaIn, deltaOut) => {
        const itmStr = String(itemId);
        const locStr = String(locationId);

        // Item total
        const itmCurr = itemTotalMap.get(itmStr) || { in: 0, out: 0 };
        itmCurr.in += deltaIn;
        itmCurr.out += deltaOut;
        itemTotalMap.set(itmStr, itmCurr);

        // Location total
        const key = `${itmStr}_${locStr}`;
        const locCurr = itemLocationMap.get(key) || { in: 0, out: 0 };
        locCurr.in += deltaIn;
        locCurr.out += deltaOut;
        itemLocationMap.set(key, locCurr);
    };

    for (const t of txSummary) {
        addStock(t._id.item, t._id.location, t.totalIn, t.totalOut);
    }
    for (const tr of transfersToSummary) {
        addStock(tr._id.item, tr._id.location, tr.total, 0);
    }
    for (const tr of transfersFromSummary) {
        addStock(tr._id.item, tr._id.location, 0, tr.total);
    }

    return items.map(item => {
        const itmStats = itemTotalMap.get(String(item._id)) || { in: 0, out: 0 };
        const currentStock = itmStats.in - itmStats.out;
        return {
            _id: item._id,
            name: item.name,
            code: item.code,
            category: item.category?.name || '—',
            unit: item.unit || 'pcs',
            reorderLevel: item.reorderLevel || 0,
            defaultLocation: item.defaultLocation?.name || '—',
            currentStock,
            isLowStock: (item.reorderLevel > 0) && (currentStock <= item.reorderLevel)
        };
    });
}

/**
 * Computes the Daily Stock Day Book & Ledger for a given date.
 */
export async function computeStockLedger({ instituteId, date, locationId = null, itemId = null }) {
    const instId = new mongoose.Types.ObjectId(instituteId);
    const { targetDate, startOfDay, endOfDay } = getISTDayBoundaries(date);
    const locId = locationId ? new mongoose.Types.ObjectId(locationId) : null;
    const itmId = itemId ? new mongoose.Types.ObjectId(itemId) : null;

    // 1. Match filters for Opening Balance (strictly before startOfDay)
    const txBeforeMatch = {
        institute: instId,
        transactionDate: { $lt: startOfDay }
    };
    if (locId) txBeforeMatch.location = locId;
    if (itmId) txBeforeMatch.item = itmId;

    // 2. Match filters for Current Day (between startOfDay and endOfDay)
    const txDayMatch = {
        institute: instId,
        transactionDate: { $gte: startOfDay, $lte: endOfDay }
    };
    if (locId) txDayMatch.location = locId;
    if (itmId) txDayMatch.item = itmId;

    // Transfers before match
    const trBeforeMatch = { institute: instId, transferDate: { $lt: startOfDay } };
    if (itmId) trBeforeMatch.item = itmId;

    // Transfers day match
    const trDayMatch = { institute: instId, transferDate: { $gte: startOfDay, $lte: endOfDay } };
    if (itmId) trDayMatch.item = itmId;

    // Opening calculation via lean $group
    const [txBefore, trBeforeTo, trBeforeFrom] = await Promise.all([
        StockTransaction.aggregate([
            { $match: txBeforeMatch },
            {
                $group: {
                    _id: null,
                    totalIn: { $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$quantity', 0] } },
                    totalOut: { $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$quantity', 0] } }
                }
            }
        ]),
        locId ? StockTransfer.aggregate([
            { $match: { ...trBeforeMatch, toLocation: locId } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]) : Promise.resolve([]),
        locId ? StockTransfer.aggregate([
            { $match: { ...trBeforeMatch, fromLocation: locId } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]) : Promise.resolve([])
    ]);

    const txInBefore = txBefore[0]?.totalIn || 0;
    const txOutBefore = txBefore[0]?.totalOut || 0;
    const trInBefore = trBeforeTo[0]?.total || 0;
    const trOutBefore = trBeforeFrom[0]?.total || 0;

    const openingStock = (txInBefore + trInBefore) - (txOutBefore + trOutBefore);

    // Fetch Day's Transactions & Transfers
    const [dayTransactions, dayTransfers] = await Promise.all([
        StockTransaction.find(txDayMatch)
            .populate('item', 'name code unit')
            .populate('location', 'name code')
            .populate('vendor', 'name')
            .populate('issuedToUser', 'name email')
            .populate('performedBy', 'name email')
            .sort({ transactionDate: 1 })
            .lean(),
        StockTransfer.find(locId ? {
            ...trDayMatch,
            $or: [{ fromLocation: locId }, { toLocation: locId }]
        } : trDayMatch)
            .populate('item', 'name code unit')
            .populate('fromLocation', 'name code')
            .populate('toLocation', 'name code')
            .populate('recordedBy', 'name email')
            .sort({ transferDate: 1 })
            .lean()
    ]);

    // Normalize day events
    const entries = [];
    let dayInflow = 0;
    let dayOutflow = 0;

    for (const tx of dayTransactions) {
        if (tx.direction === 'IN') {
            dayInflow += tx.quantity;
        } else {
            dayOutflow += tx.quantity;
        }

        entries.push({
            id: tx._id,
            timestamp: tx.transactionDate,
            model: 'StockTransaction',
            type: tx.type,
            direction: tx.direction,
            item: {
                id: tx.item?._id,
                name: tx.item?.name,
                code: tx.item?.code,
                unit: tx.item?.unit || 'pcs'
            },
            location: tx.location?.name || '—',
            quantity: tx.quantity,
            unitPrice: tx.unitPrice,
            party: tx.type === 'PURCHASE_IN'
                ? (tx.vendor?.name || 'Direct Purchase')
                : (tx.issuedToUser?.name || tx.issuedToLabel || 'General Issue'),
            referenceNo: tx.referenceNo || '—',
            reason: tx.reason,
            notes: tx.notes,
            performedBy: tx.performedBy?.name || '—'
        });
    }

    for (const tr of dayTransfers) {
        // If a specific location is filtered:
        // is it incoming or outgoing for that location?
        if (locId) {
            const isIncoming = String(tr.toLocation?._id) === String(locId);
            if (isIncoming) {
                dayInflow += tr.quantity;
                entries.push({
                    id: tr._id,
                    timestamp: tr.transferDate,
                    model: 'StockTransfer',
                    type: 'TRANSFER_IN',
                    direction: 'IN',
                    item: {
                        id: tr.item?._id,
                        name: tr.item?.name,
                        code: tr.item?.code,
                        unit: tr.item?.unit || 'pcs'
                    },
                    location: tr.toLocation?.name,
                    quantity: tr.quantity,
                    party: `From: ${tr.fromLocation?.name || 'Store'}`,
                    referenceNo: tr.referenceNumber || '—',
                    notes: tr.notes,
                    performedBy: tr.recordedBy?.name || '—'
                });
            } else {
                dayOutflow += tr.quantity;
                entries.push({
                    id: tr._id,
                    timestamp: tr.transferDate,
                    model: 'StockTransfer',
                    type: 'TRANSFER_OUT',
                    direction: 'OUT',
                    item: {
                        id: tr.item?._id,
                        name: tr.item?.name,
                        code: tr.item?.code,
                        unit: tr.item?.unit || 'pcs'
                    },
                    location: tr.fromLocation?.name,
                    quantity: tr.quantity,
                    party: `To: ${tr.toLocation?.name || 'Store'}`,
                    referenceNo: tr.referenceNumber || '—',
                    notes: tr.notes,
                    performedBy: tr.recordedBy?.name || '—'
                });
            }
        } else {
            // Consolidated view: transfers are inter-store movements (net institute change = 0)
            entries.push({
                id: tr._id,
                timestamp: tr.transferDate,
                model: 'StockTransfer',
                type: 'TRANSFER',
                direction: 'CONTRA',
                item: {
                    id: tr.item?._id,
                    name: tr.item?.name,
                    code: tr.item?.code,
                    unit: tr.item?.unit || 'pcs'
                },
                location: `${tr.fromLocation?.name} → ${tr.toLocation?.name}`,
                quantity: tr.quantity,
                party: `${tr.fromLocation?.name} → ${tr.toLocation?.name}`,
                referenceNo: tr.referenceNumber || '—',
                notes: tr.notes,
                performedBy: tr.recordedBy?.name || '—'
            });
        }
    }

    // Sort entries chronologically
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate running balance
    let running = openingStock;
    for (const e of entries) {
        if (e.direction === 'IN') {
            running += e.quantity;
        } else if (e.direction === 'OUT') {
            running -= e.quantity;
        }
        e.runningBalance = running;
    }

    const closingStock = openingStock + dayInflow - dayOutflow;

    return {
        date: targetDate,
        openingStock,
        dayInflow,
        dayOutflow,
        netChange: dayInflow - dayOutflow,
        closingStock,
        entries
    };
}
