import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { decryptSecret } from '@/lib/crypto';

/**
 * @route   GET /api/v1/institute/notifications/openwa-qr
 * @desc    Fetch live WhatsApp Web QR Code and Connection Status from OpenWA Server
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: 'No institute context found.' }, { status: 400 });
        }

        const inst = await Institute.findById(instituteId).select('notifications code name');
        const config = inst?.notifications || {};

        // Fallback to platform-level server URL and API Key
        const baseUrl = (config.openwaServerUrl || process.env.OPENWA_SERVER_URL || 'http://localhost:2785').replace(/\/+$/, '');
        const apiKey = config.openwaApiKey ? decryptSecret(config.openwaApiKey) : (process.env.OPENWA_API_KEY || '');
        const sessionId = config.openwaSessionId || (inst?.code ? `inst_${inst.code.toLowerCase()}` : `inst_${instituteId}`);

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
            headers['api_key'] = apiKey;
        }

        // 1. Check if already connected / logged in
        let isConnected = false;
        let connectionStatus = 'DISCONNECTED';
        let phone = null;

        try {
            const statusUrl = `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/status`;
            const statusRes = await fetch(statusUrl, { headers, cache: 'no-store' });
            if (statusRes.ok) {
                const statusData = await statusRes.json().catch(() => ({}));
                isConnected = statusData.connected || statusData.state === 'CONNECTED' || statusData.status === 'ready' || statusData.status === 'CONNECTED';
                connectionStatus = statusData.state || statusData.status || (isConnected ? 'CONNECTED' : 'DISCONNECTED');
                phone = statusData.phone || statusData.me || statusData.user || null;
            } else if (statusRes.status === 404) {
                // Try initializing the session
                await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/start`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ sessionId })
                }).catch(() => {});
            }
        } catch {
            // Fallback status check
        }

        if (isConnected) {
            return NextResponse.json({
                success: true,
                connected: true,
                status: connectionStatus,
                phone: phone,
                sessionId: sessionId,
                message: 'WhatsApp is connected and logged in!'
            });
        }

        // 2. Fetch live QR Code
        const candidateQrEndpoints = [
            `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/qr`,
            `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/screenshot`,
            `${baseUrl}/api/getQr`,
            `${baseUrl}/getQr`,
            `${baseUrl}/qr`
        ];

        let qrData = null;

        for (const qrUrl of candidateQrEndpoints) {
            try {
                const qrRes = await fetch(qrUrl, { headers, cache: 'no-store' });
                if (qrRes.ok) {
                    const contentType = qrRes.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        const json = await qrRes.json();
                        qrData = json.qr || json.data || json.image || json.base64 || null;
                        if (qrData) break;
                    } else if (contentType.includes('image/')) {
                        const buffer = await qrRes.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        qrData = `data:${contentType};base64,${base64}`;
                        break;
                    }
                }
            } catch {
                // Try next endpoint
            }
        }

        return NextResponse.json({
            success: true,
            connected: isConnected,
            status: connectionStatus,
            qr: qrData,
            serverUrl: baseUrl,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('[OPENWA_QR_ERROR]', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to connect to OpenWA server. Ensure your OpenWA service is running.' 
        }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/institute/notifications/openwa-qr
 * @desc    Disconnect / Logout active OpenWA session
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: 'No institute context found.' }, { status: 400 });
        }

        const inst = await Institute.findById(instituteId).select('notifications code');
        const config = inst?.notifications || {};

        const baseUrl = (config.openwaServerUrl || process.env.OPENWA_SERVER_URL || 'http://localhost:2785').replace(/\/+$/, '');
        const apiKey = config.openwaApiKey ? decryptSecret(config.openwaApiKey) : (process.env.OPENWA_API_KEY || '');
        const sessionId = config.openwaSessionId || (inst?.code ? `inst_${inst.code.toLowerCase()}` : `inst_${instituteId}`);

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
            headers['api_key'] = apiKey;
        }

        // Call OpenWA logout & stop
        await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/logout`, { method: 'POST', headers }).catch(() => {});
        await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/stop`, { method: 'POST', headers }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: 'WhatsApp session disconnected successfully.'
        });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Failed to disconnect session' }, { status: 500 });
    }
}
