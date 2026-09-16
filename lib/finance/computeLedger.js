/**
 * lib/finance/computeLedger.js
 *
 * Core aggregation engine for the Daily Financial Ledger & Day Book.
 * Pulls from Fee, TransportFee, HostelAllotment, Income, Expense, CollectorTransfer
 * and normalizes them into one unified, sorted ledger with opening/closing balances.
 *
 * Feature flags aware:
 * - Dynamically checks features.transport and features.hostel per institute.
 * - If an institute does not have transport or hostel, those queries are skipped entirely.
 */

import mongoose from 'mongoose';
import Fee from '@/models/Fee';
import TransportFee from '@/models/TransportFee';
import HostelAllotment from '@/models/HostelAllotment';
import Income from '@/models/Income';
import Expense from '@/models/Expense';
import CollectorTransfer from '@/models/CollectorTransfer';
import Collector from '@/models/Collector';

export const UNASSIGNED_LABEL = 'Unassigned / General Counter';

// ---------------------------------------------------------------------------
// Normalize the two different paymentMethod vocabularies into one bucket set.
// ---------------------------------------------------------------------------
const METHOD_BUCKET = {
  cash: 'Cash', Cash: 'Cash',
  card: 'Card', Card: 'Card',
  upi: 'UPI', UPI: 'UPI',
  bank_transfer: 'Bank Transfer', 'Bank Transfer': 'Bank Transfer',
  cheque: 'Cheque', Cheque: 'Cheque',
  Other: 'Other',
};

export function normalizeMethod(raw) {
  return METHOD_BUCKET[raw] || 'Other';
}

// ---------------------------------------------------------------------------
// Day boundaries, fixed IST (UTC+5:30) — confirmed correct for this app.
// ---------------------------------------------------------------------------
export function getDayBounds(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
}

function collectorNameExpr(collectorNameFilter) {
  return {
    $expr: {
      $eq: [
        { $trim: { input: { $toLower: { $ifNull: ['$installments.collectedBy', ''] } } } },
        collectorNameFilter.trim().toLowerCase(),
      ],
    },
  };
}

const FEE_MODEL_CONFIG = {
  'Academic Fee': { Model: Fee, extraMatch: { deletedAt: null }, hasBatch: true },
  'Transport Fee': { Model: TransportFee, extraMatch: { deletedAt: null }, hasBatch: false },
  'Hostel Fee': { Model: HostelAllotment, extraMatch: { feeStatus: { $ne: 'cancelled' } }, hasBatch: false },
};

// ---------------------------------------------------------------------------
// LEAN sum-only pipeline — used for opening balance. No $lookup, no per-row
// documents pulled into Node. Stays fast even over years of history.
// ---------------------------------------------------------------------------
async function sumInstallments({ feeType, instituteId, dateMatch, collectorNameFilter }) {
  const { Model, extraMatch } = FEE_MODEL_CONFIG[feeType];
  const pipeline = [
    { $match: { institute: instituteId, ...extraMatch } },
    { $unwind: '$installments' },
    { $match: { 'installments.status': 'paid', 'installments.paidDate': dateMatch } },
  ];
  if (collectorNameFilter) pipeline.push({ $match: collectorNameExpr(collectorNameFilter) });
  pipeline.push({ $group: { _id: null, total: { $sum: '$installments.amount' } } });

  const result = await Model.aggregate(pipeline);
  return result[0]?.total || 0;
}

async function sumIncome({ instituteId, dateMatch, collectorId }) {
  const match = { institute: instituteId, date: dateMatch };
  if (collectorId) match.receivedInAccount = collectorId;
  const result = await Income.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return result[0]?.total || 0;
}

async function sumExpense({ instituteId, dateMatch, collectorId }) {
  const match = { institute: instituteId, date: dateMatch };
  if (collectorId) match.paidByAccount = collectorId;
  const result = await Expense.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return result[0]?.total || 0;
}

async function sumTransfers({ instituteId, dateMatch, collectorId }) {
  // Only relevant for single-account opening balance (consolidated excludes transfers).
  if (!collectorId) return { inflow: 0, outflow: 0 };
  const [inRes, outRes] = await Promise.all([
    CollectorTransfer.aggregate([
      { $match: { institute: instituteId, transferDate: dateMatch, toCollector: collectorId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    CollectorTransfer.aggregate([
      { $match: { institute: instituteId, transferDate: dateMatch, fromCollector: collectorId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  return { inflow: inRes[0]?.total || 0, outflow: outRes[0]?.total || 0 };
}

/**
 * Opening balance = net of everything strictly before `start`.
 * Uses lean $group sums only — skips inactive feature models.
 */
async function computeOpeningBalance({ instituteId, start, collectorNameFilter, collectorId, features }) {
  const dateMatch = { $lt: start };

  const [academicSum, transportSum, hostelSum, incomeSum, expenseSum, transferSums] = await Promise.all([
    sumInstallments({ feeType: 'Academic Fee', instituteId, dateMatch, collectorNameFilter }),
    features?.transport ? sumInstallments({ feeType: 'Transport Fee', instituteId, dateMatch, collectorNameFilter }) : Promise.resolve(0),
    features?.hostel ? sumInstallments({ feeType: 'Hostel Fee', instituteId, dateMatch, collectorNameFilter }) : Promise.resolve(0),
    sumIncome({ instituteId, dateMatch, collectorId }),
    sumExpense({ instituteId, dateMatch, collectorId }),
    sumTransfers({ instituteId, dateMatch, collectorId }),
  ]);

  const inflow = academicSum + transportSum + hostelSum + incomeSum + transferSums.inflow;
  const outflow = expenseSum + transferSums.outflow;
  return inflow - outflow;
}

// ---------------------------------------------------------------------------
// Row-level fetchers — used only for the target day's display list
// ---------------------------------------------------------------------------
async function getInstallmentEntries({ feeType, instituteId, dateMatch, collectorNameFilter, knownCollectorNamesLower }) {
  const { Model, extraMatch, hasBatch } = FEE_MODEL_CONFIG[feeType];

  const pipeline = [
    { $match: { institute: instituteId, ...extraMatch } },
    { $unwind: '$installments' },
    { $match: { 'installments.status': 'paid', 'installments.paidDate': dateMatch } },
  ];
  if (collectorNameFilter) pipeline.push({ $match: collectorNameExpr(collectorNameFilter) });

  pipeline.push(
    { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' } },
    { $unwind: { path: '$studentDoc', preserveNullAndEmptyArrays: true } }
  );

  if (hasBatch) {
    pipeline.push(
      { $lookup: { from: 'batches', localField: 'batch', foreignField: '_id', as: 'batchDoc' } },
      { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } }
    );
  }

  pipeline.push({
    $project: {
      _id: 0,
      instId: '$installments._id',
      parentId: '$_id',
      timestamp: '$installments.paidDate',
      amount: '$installments.amount',
      paymentMethod: '$installments.paymentMethod',
      collectedBy: '$installments.collectedBy',
      transactionId: '$installments.transactionId',
      notes: '$installments.notes',
      studentName: {
        $trim: {
          input: {
            $concat: [
              { $ifNull: ['$studentDoc.profile.firstName', ''] },
              ' ',
              { $ifNull: ['$studentDoc.profile.lastName', ''] },
            ],
          },
        },
      },
      enrollmentNumber: '$studentDoc.enrollmentNumber',
      batchName: hasBatch ? '$batchDoc.name' : { $literal: null },
    },
  });

  const rows = await Model.aggregate(pipeline);

  return rows.map((r) => {
    const rawName = (r.collectedBy || '').trim();
    const isKnownCollector = rawName && knownCollectorNamesLower.has(rawName.toLowerCase());
    const account = collectorNameFilter ? rawName : (isKnownCollector ? rawName : UNASSIGNED_LABEL);
    const partySuffix = r.batchName ? `, ${r.batchName}` : '';

    return {
      id: `${feeType.replace(/\s+/g, '_')}-${r.parentId}-${r.instId}`,
      timestamp: r.timestamp,
      type: 'FEE',
      direction: 'IN',
      category: feeType,
      party: r.studentName
        ? `${r.studentName} (${r.enrollmentNumber || 'N/A'})${partySuffix}`
        : 'Unknown Student',
      account,
      paymentMethod: normalizeMethod(r.paymentMethod),
      amount: r.amount || 0,
      reference: r.transactionId || '',
      notes: r.notes || '',
    };
  });
}

async function getIncomeEntries({ instituteId, dateMatch, collectorId }) {
  const match = { institute: instituteId, date: dateMatch };
  if (collectorId) match.receivedInAccount = collectorId;

  const rows = await Income.find(match).populate('incomeHead', 'name').populate('receivedInAccount', 'name').lean();

  return rows.map((r) => ({
    id: `INCOME-${r._id}`,
    timestamp: r.date,
    type: 'INCOME',
    direction: 'IN',
    category: r.incomeHead?.name || 'General Income',
    party: r.receivedFrom || '—',
    account: r.receivedInAccount?.name || UNASSIGNED_LABEL,
    paymentMethod: normalizeMethod(r.paymentMode),
    amount: r.amount || 0,
    reference: '',
    notes: r.description || '',
  }));
}

async function getExpenseEntries({ instituteId, dateMatch, collectorId }) {
  const match = { institute: instituteId, date: dateMatch };
  if (collectorId) match.paidByAccount = collectorId;

  const rows = await Expense.find(match).populate('expenseHead', 'name').populate('paidByAccount', 'name').lean();

  return rows.map((r) => ({
    id: `EXPENSE-${r._id}`,
    timestamp: r.date,
    type: 'EXPENSE',
    direction: 'OUT',
    category: r.expenseHead?.name || 'General Expense',
    party: r.paidTo || '—',
    account: r.paidByAccount?.name || UNASSIGNED_LABEL,
    paymentMethod: normalizeMethod(r.paymentMode),
    amount: r.amount || 0,
    reference: '',
    notes: r.description || '',
  }));
}

async function getTransferEntries({ instituteId, dateMatch, collectorId }) {
  const match = { institute: instituteId, transferDate: dateMatch };
  if (collectorId) match.$or = [{ fromCollector: collectorId }, { toCollector: collectorId }];

  const rows = await CollectorTransfer.find(match).populate('fromCollector', 'name').populate('toCollector', 'name').lean();

  return rows.map((r) => {
    const isOutForThisAccount = collectorId && String(r.fromCollector?._id) === String(collectorId);
    return {
      id: `TRANSFER-${r._id}`,
      timestamp: r.transferDate,
      type: isOutForThisAccount ? 'TRANSFER_OUT' : 'TRANSFER_IN',
      direction: isOutForThisAccount ? 'OUT' : 'IN',
      category: 'Inter-Account Transfer',
      party: isOutForThisAccount ? `To: ${r.toCollector?.name || '—'}` : `From: ${r.fromCollector?.name || '—'}`,
      account: collectorId
        ? (isOutForThisAccount ? r.fromCollector?.name : r.toCollector?.name) || '—'
        : `${r.fromCollector?.name || '—'} → ${r.toCollector?.name || '—'}`,
      paymentMethod: 'Bank Transfer',
      amount: r.amount || 0,
      reference: r.referenceNumber || '',
      notes: r.notes || '',
    };
  });
}

function sumByDirection(entries) {
  return entries.reduce(
    (acc, e) => {
      if (e.direction === 'IN') acc.inflow += e.amount;
      else acc.outflow += e.amount;
      return acc;
    },
    { inflow: 0, outflow: 0 }
  );
}

/**
 * Main entry point.
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.instituteId
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {string} [params.accountId] - Collector ObjectId; omit for consolidated view
 * @param {Object} [params.features] - { transport: boolean, hostel: boolean }
 * @param {string} [params.instituteType] - 'VOCATIONAL' | 'SCHOOL' | 'COLLEGE'
 */
export async function computeLedger({
  instituteId,
  date,
  accountId,
  features = { transport: true, hostel: true },
  instituteType = 'COLLEGE'
}) {
  const instId = new mongoose.Types.ObjectId(instituteId);
  const { start, end } = getDayBounds(date);
  const dateMatch = { $gte: start, $lte: end };

  let collectorNameFilter = null;
  let collectorId = null;

  if (accountId) {
    const collector = await Collector.findOne({ _id: accountId, institute: instId }).lean();
    if (!collector) throw new Error('Account not found for this institute');
    collectorNameFilter = collector.name;
    collectorId = collector._id;
  }

  // Load registered collectors for account drawer normalization
  const allCollectors = await Collector.find({ institute: instId }, 'name accountType').lean();
  const knownCollectorNamesLower = new Set(allCollectors.map((c) => c.name.trim().toLowerCase()));

  const openingBalance = await computeOpeningBalance({
    instituteId: instId,
    start,
    collectorNameFilter,
    collectorId,
    features,
  });

  const [feeRows, transportRows, hostelRows, incomeRows, expenseRows, transferEntries] = await Promise.all([
    getInstallmentEntries({ feeType: 'Academic Fee', instituteId: instId, dateMatch, collectorNameFilter, knownCollectorNamesLower }),
    features?.transport
      ? getInstallmentEntries({ feeType: 'Transport Fee', instituteId: instId, dateMatch, collectorNameFilter, knownCollectorNamesLower })
      : Promise.resolve([]),
    features?.hostel
      ? getInstallmentEntries({ feeType: 'Hostel Fee', instituteId: instId, dateMatch, collectorNameFilter, knownCollectorNamesLower })
      : Promise.resolve([]),
    getIncomeEntries({ instituteId: instId, dateMatch, collectorId }),
    getExpenseEntries({ instituteId: instId, dateMatch, collectorId }),
    getTransferEntries({ instituteId: instId, dateMatch, collectorId }),
  ]);

  const coreEntries = [...feeRows, ...transportRows, ...hostelRows, ...incomeRows, ...expenseRows];

  // Consolidated: transfers excluded from totals but shown in display list.
  // Account mode: transfers participate in totals.
  const entriesForTotals = accountId ? [...coreEntries, ...transferEntries] : coreEntries;
  const allEntriesForDisplay = [...coreEntries, ...transferEntries].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const { inflow: totalInflow, outflow: totalOutflow } = sumByDirection(entriesForTotals);
  const netChange = totalInflow - totalOutflow;
  const closingBalance = openingBalance + netChange;

  const breakdownByMethod = {};
  for (const e of entriesForTotals) {
    breakdownByMethod[e.paymentMethod] = (breakdownByMethod[e.paymentMethod] || 0) + (e.direction === 'IN' ? e.amount : -e.amount);
  }

  const breakdownByAccount = {};
  for (const e of allEntriesForDisplay) {
    if (e.category === 'Inter-Account Transfer' && !accountId) {
      continue;
    }
    const rawName = (e.account || '').trim();
    const isKnown = rawName && knownCollectorNamesLower.has(rawName.toLowerCase());
    const key = isKnown ? rawName : UNASSIGNED_LABEL;
    breakdownByAccount[key] = (breakdownByAccount[key] || 0) + (e.direction === 'IN' ? e.amount : -e.amount);
  }

  return {
    date,
    mode: accountId ? 'account' : 'consolidated',
    accountId: accountId || null,
    instituteType,
    features: {
      transport: !!features?.transport,
      hostel: !!features?.hostel,
    },
    openingBalance,
    totalInflow,
    totalOutflow,
    netChange,
    closingBalance,
    breakdownByMethod,
    breakdownByAccount,
    summary: {
      feeTotal: feeRows.reduce((s, r) => s + r.amount, 0),
      transportTotal: transportRows.reduce((s, r) => s + r.amount, 0),
      hostelTotal: hostelRows.reduce((s, r) => s + r.amount, 0),
      incomeTotal: incomeRows.reduce((s, r) => s + r.amount, 0),
      expenseTotal: expenseRows.reduce((s, r) => s + r.amount, 0),
      transfersTotal: transferEntries.reduce((s, r) => s + r.amount, 0),
      transactionCount: allEntriesForDisplay.length,
    },
    entries: allEntriesForDisplay,
  };
}
