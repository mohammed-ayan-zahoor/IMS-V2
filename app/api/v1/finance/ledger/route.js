/**
 * app/api/v1/finance/ledger/route.js
 *
 * GET /api/v1/finance/ledger?date=2026-09-12&accountId=<CollectorId>
 *
 * Query params:
 *   date       - 'YYYY-MM-DD', defaults to today (IST)
 *   accountId  - optional Collector ObjectId; omit for consolidated institute view
 *
 * Institute Feature Awareness:
 *   - Works across all institute types: VOCATIONAL, SCHOOL, COLLEGE.
 *   - Dynamically checks institute settings for `transport` and `hostel` toggles.
 *   - Institutes with transport disabled skip transport fee calculations.
 *   - Institutes with hostel disabled skip hostel fee calculations.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Collector from '@/models/Collector';
import Institute from '@/models/Institute';
import { computeLedger } from '@/lib/finance/computeLedger';

function todayIST() {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instituteId = session.user.institute?.id;
    if (!instituteId && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Institute context missing' }, { status: 400 });
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
    const hasFeePermission = isAdmin || session.user.permissions?.includes('manage_fees');

    if (!hasFeePermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Query institute type & feature toggles (transport, hostel, etc.)
    let instituteDoc = null;
    if (instituteId) {
      instituteDoc = await Institute.findById(instituteId).select('type settings.features').lean();
    }
    const instFeatures = instituteDoc?.settings?.features || session.user.institute?.features || {};
    const isTransportEnabled = !!instFeatures.transport;
    const isHostelEnabled = !!instFeatures.hostel;
    const instituteType = instituteDoc?.type || session.user.institute?.type || 'COLLEGE';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || todayIST();

    let accountId = searchParams.get('accountId') || null;

    // Non-admin staff are hard-locked to their own account, regardless of what
    // the query string says.
    if (!isAdmin) {
      let staffCollectorId = session.user.collectorId || null;

      if (!staffCollectorId) {
        // Fallback: match by staff email or display name in Accounts Master
        const orConditions = [];
        if (session.user.email) {
          orConditions.push({ email: session.user.email.toLowerCase().trim() });
        }
        if (session.user.name) {
          orConditions.push({ name: session.user.name.trim() });
        }

        if (orConditions.length > 0) {
          const match = await Collector.findOne({
            institute: instituteId,
            $or: orConditions,
          }).select('_id').lean();

          if (match) {
            staffCollectorId = match._id.toString();
          }
        }
      }

      if (!staffCollectorId) {
        return NextResponse.json(
          { error: 'No cashier drawer account found for your profile in Accounts Master. Please contact an administrator.' },
          { status: 403 }
        );
      }

      accountId = staffCollectorId;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format, expected YYYY-MM-DD' }, { status: 400 });
    }

    const ledger = await computeLedger({
      instituteId,
      date,
      accountId,
      features: {
        transport: isTransportEnabled,
        hostel: isHostelEnabled,
      },
      instituteType,
    });

    return NextResponse.json(ledger);
  } catch (err) {
    console.error('[GET /api/v1/finance/ledger]', err);
    return NextResponse.json({ error: err.message || 'Failed to compute ledger' }, { status: 500 });
  }
}
