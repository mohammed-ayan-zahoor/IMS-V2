import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { decryptSecret } from '@/lib/crypto';
import QRCode from 'qrcode';

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
        const sessionName = inst?.code ? `inst_${inst.code.toLowerCase()}` : `inst_${instituteId}`;

        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
            headers['api_key'] = apiKey;
        }

        // Resolve or create OpenWA Session by UUID
        let activeSessionId = config.openwaSessionId;

        // Check list of existing sessions in OpenWA
        try {
            const listRes = await fetch(`${baseUrl}/api/sessions`, { headers, cache: 'no-store' });
            if (listRes.ok) {
                const listData = await listRes.json();
                const sessions = Array.isArray(listData) ? listData : (listData.sessions || listData.data || []);
                const match = sessions.find(s => 
                    (activeSessionId && s.id === activeSessionId) || 
                    (s.name && s.name.toLowerCase() === sessionName.toLowerCase())
                );

                if (match) {
                    activeSessionId = match.id;
                    if (match.id !== config.openwaSessionId) {
                        await Institute.findByIdAndUpdate(instituteId, { 'notifications.openwaSessionId': match.id });
                    }
                } else {
                    // Create session
                    const createRes = await fetch(`${baseUrl}/api/sessions`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ name: sessionName })
                    });
                    if (createRes.ok) {
                        const newSess = await createRes.json();
                        activeSessionId = newSess.id || newSess.sessionId;
                        if (activeSessionId) {
                            await Institute.findByIdAndUpdate(instituteId, { 'notifications.openwaSessionId': activeSessionId });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[OPENWA_SESSION_DISCOVERY_ERROR]', err.message);
        }

        if (!activeSessionId) {
            activeSessionId = sessionName;
        }

        // 1. Check session existence & status in OpenWA
        let isConnected = false;
        let connectionStatus = 'DISCONNECTED';
        let phone = null;

        try {
            const sessionCheckUrl = `${baseUrl}/api/sessions/${encodeURIComponent(activeSessionId)}`;
            const sessionCheckRes = await fetch(sessionCheckUrl, { headers, cache: 'no-store' });

            if (sessionCheckRes.ok) {
                const sessData = await sessionCheckRes.json().catch(() => ({}));
                const state = (sessData.status || sessData.state || '').toLowerCase();
                if (state === 'ready' || state === 'connected' || state === 'authenticated' || state === 'working') {
                    isConnected = true;
                    connectionStatus = 'CONNECTED';
                    phone = sessData.phone || sessData.me?.id || sessData.me?.user || sessData.user || null;
                } else if (state === 'created' || state === 'stopped' || state === 'disconnected' || state === 'failed') {
                    // Start the session
                    await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(activeSessionId)}/start`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({})
                    }).catch(() => {});
                }
            } else if (sessionCheckRes.status === 404) {
                // Try start
                await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(activeSessionId)}/start`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({})
                }).catch(() => {});
            }
        } catch (e) {
            console.log('[OPENWA_STATUS_CHECK_FALLBACK]', e.message);
        }

        if (isConnected) {
            return NextResponse.json({
                success: true,
                connected: true,
                status: 'CONNECTED',
                phone: phone,
                sessionId: activeSessionId,
                message: 'WhatsApp is connected and logged in!'
            });
        }

        // 2. Fetch live QR Code
        const candidateQrEndpoints = [
            `${baseUrl}/api/sessions/${encodeURIComponent(activeSessionId)}/qr`,
            `${baseUrl}/api/sessions/${encodeURIComponent(activeSessionId)}/screenshot`,
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
                        let raw = json.qr || json.data || json.image || json.base64 || json.code || json.raw;
                        if (!raw && typeof json === 'string') raw = json;

                        if (raw && typeof raw === 'string' && raw.trim()) {
                            const trimmed = raw.trim();
                            if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                qrData = trimmed;
                            } else if (trimmed.startsWith('iVBORw0KGgo') || trimmed.length > 500) {
                                qrData = `data:image/png;base64,${trimmed}`;
                            } else {
                                // Raw WhatsApp pairing code string -> render to standard data URI
                                try {
                                    qrData = await QRCode.toDataURL(trimmed, { width: 300, margin: 2 });
                                } catch {
                                    qrData = trimmed;
                                }
                            }
                            break;
                        }
                    } else if (contentType.includes('image/')) {
                        const buffer = await qrRes.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        qrData = `data:${contentType};base64,${base64}`;
                        break;
                    } else {
                        const text = (await qrRes.text()).trim();
                        if (text && text.length > 5) {
                            if (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://')) {
                                qrData = text;
                            } else {
                                try {
                                    qrData = await QRCode.toDataURL(text, { width: 300, margin: 2 });
                                } catch {
                                    qrData = text;
                                }
                            }
                            break;
                        }
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
            sessionId: activeSessionId
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
