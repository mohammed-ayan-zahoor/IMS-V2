/**
 * IMS-V2 Biometric Bridge
 * -----------------------
 * Run this on ANY PC/laptop connected to the school LAN.
 * It connects to the ZKTeco/eSSL device, grabs attendance punches,
 * and sends them to the IMS-V2 server automatically.
 *
 * SETUP (one time):
 *   npm install zkteco-js        ← run once in the IMS-V2 project folder
 *
 * RUN:
 *   node scripts/biometric-bridge.js
 *
 * Or with custom values:
 *   DEVICE_IP=192.168.1.224 IMS_API_KEY=your_key node scripts/biometric-bridge.js
 *
 * FLAGS:
 *   --test       Test device + server reachability, then exit
 *   --simulate   Send a fake punch to the server (for testing without device)
 */

const path = require('path');
const fs   = require('fs');

// ── Configuration ─────────────────────────────────────────────────────────────
const CONFIG = {
    DEVICE_IP:          process.env.DEVICE_IP          || '192.168.1.224',
    DEVICE_PORT:        parseInt(process.env.DEVICE_PORT || '4370', 10),
    IMS_API_URL:        process.env.IMS_API_URL        || 'https://imsportal.3ftech.in/api/v1/hr/attendance/biometric',
    IMS_API_KEY:        process.env.IMS_API_KEY        || '',            // REQUIRED — copy from HR Settings page
    RECONNECT_DELAY_MS: 10_000,                                          // retry after 10s on disconnect
    STATE_FILE:         path.join(__dirname, '.biometric_state.json')
};

function log(msg) {
    const t = new Date().toLocaleTimeString('en-IN', { hour12: true });
    console.log(`[${t}] ${msg}`);
}

// ── Persist last-synced timestamp so we don't re-push old records on restart ──
function loadState() {
    try {
        if (fs.existsSync(CONFIG.STATE_FILE))
            return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
    } catch (_) {}
    return { lastSyncedAt: null };
}

function saveState(state) {
    try { fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2)); }
    catch (_) {}
}

// ── Push punches to IMS-V2 ────────────────────────────────────────────────────
async function pushToIMS(punches) {
    if (!punches.length) return;
    log(`→ Sending ${punches.length} punch(es) to IMS-V2...`);
    try {
        const res = await fetch(CONFIG.IMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-biometric-key': CONFIG.IMS_API_KEY
            },
            body: JSON.stringify({ punches })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        log(`✓ Server: ${data.message} (matched: ${data.results?.matched ?? '?'}, unmatched: ${data.results?.unmatched?.length ?? 0})`);
        return data;
    } catch (err) {
        log(`✗ Push failed: ${err.message}`);
        throw err;
    }
}

// ── Normalize ZK log entry to our punch format ────────────────────────────────
function normalizePunch(entry) {
    // zkteco-js returns: { deviceUserId, recordTime, ... }
    return {
        biometricId: String(entry.deviceUserId).trim(),
        timestamp:   entry.recordTime instanceof Date
                        ? entry.recordTime.toISOString()
                        : new Date(entry.recordTime).toISOString(),
        deviceId: CONFIG.DEVICE_IP
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);

    // ── --simulate: send a fake punch for testing ────────────────────────────
    if (args.includes('--simulate')) {
        if (!CONFIG.IMS_API_KEY) { log('Set IMS_API_KEY first.'); process.exit(1); }
        const biometricId = args.find(a => /^\d+$/.test(a)) || '101';
        log(`Simulating punch for Biometric ID: ${biometricId}`);
        await pushToIMS([{ biometricId, timestamp: new Date().toISOString(), deviceId: 'SIMULATOR' }]);
        return;
    }

    // ── --test: check reachability then exit ─────────────────────────────────
    if (args.includes('--test')) {
        log('--- Diagnostics ---');
        log(`Device:  ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}`);
        log(`Server:  ${CONFIG.IMS_API_URL}`);
        log(`API Key: ${CONFIG.IMS_API_KEY ? CONFIG.IMS_API_KEY.slice(0, 12) + '...' : '⚠ NOT SET'}`);

        try {
            const res = await fetch(CONFIG.IMS_API_URL);
            const d   = await res.json();
            log(`Server status: ${d.status || 'OK'}`);
        } catch (e) {
            log(`Server unreachable: ${e.message}`);
        }

        const net = require('net');
        await new Promise(resolve => {
            const s = new net.Socket();
            s.setTimeout(4000);
            s.connect(CONFIG.DEVICE_PORT, CONFIG.DEVICE_IP, () => {
                log(`Device reachable at ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT} ✓`);
                s.destroy(); resolve();
            });
            s.on('error', e => { log(`Device NOT reachable: ${e.message}`); s.destroy(); resolve(); });
            s.on('timeout', () => { log(`Device connection timed out`); s.destroy(); resolve(); });
        });
        return;
    }

    // ── Validate API key before starting ─────────────────────────────────────
    if (!CONFIG.IMS_API_KEY) {
        log('');
        log('ERROR: IMS_API_KEY is not set!');
        log('Get it from: IMS Portal → HR Settings → Biometric Hardware Integration');
        log('Then run:  IMS_API_KEY=your_key node scripts/biometric-bridge.js');
        log('');
        process.exit(1);
    }

    log('IMS-V2 Biometric Bridge starting...');
    log(`Device: ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}`);
    log(`Server: ${CONFIG.IMS_API_URL}`);

    // Dynamically require zkteco-js (must be installed)
    let ZKLib;
    try {
        ZKLib = require('zkteco-js');
    } catch (_) {
        log('');
        log('ERROR: zkteco-js is not installed.');
        log('Run this once:  npm install zkteco-js');
        log('Then re-run the bridge.');
        log('');
        process.exit(1);
    }

    // ── Connection loop — reconnects automatically on drop ───────────────────
    async function connect() {
        const zk = new ZKLib(CONFIG.DEVICE_IP, CONFIG.DEVICE_PORT, 5200, 5000);
        const state = loadState();

        try {
            await zk.createSocket();
            log('Connected to device ✓');

            // 1. Pull historical logs (only ones after last sync)
            log('Fetching stored punch logs...');
            const { data: logs } = await zk.getAttendances();
            const lastSynced = state.lastSyncedAt ? new Date(state.lastSyncedAt) : new Date(0);

            const newLogs = (logs || []).filter(e => {
                const t = e.recordTime instanceof Date ? e.recordTime : new Date(e.recordTime);
                return t > lastSynced;
            });

            if (newLogs.length > 0) {
                log(`Found ${newLogs.length} new stored punch(es) since last sync.`);
                await pushToIMS(newLogs.map(normalizePunch));
                state.lastSyncedAt = new Date().toISOString();
                saveState(state);
            } else {
                log('No new stored punches since last sync.');
            }

            // 2. Stream real-time punches as they happen
            log('Listening for live punches...');
            await zk.getRealTimeLogs(async (data) => {
                if (!data?.userId) return;
                log(`Live punch detected: Biometric ID ${data.userId}`);
                const punch = {
                    biometricId: String(data.userId).trim(),
                    timestamp:   new Date().toISOString(),
                    deviceId:    CONFIG.DEVICE_IP
                };
                try {
                    await pushToIMS([punch]);
                    state.lastSyncedAt = new Date().toISOString();
                    saveState(state);
                } catch (_) {
                    // push failure logged inside pushToIMS; keep listening
                }
            });

        } catch (err) {
            log(`Connection error: ${err.message}`);
            try { await zk.disconnect(); } catch (_) {}
            log(`Retrying in ${CONFIG.RECONNECT_DELAY_MS / 1000}s...`);
            setTimeout(connect, CONFIG.RECONNECT_DELAY_MS);
        }
    }

    connect();
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
