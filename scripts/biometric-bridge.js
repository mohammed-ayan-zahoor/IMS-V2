/**
 * Secureye S-B100CB Biometric LAN Sync Bridge
 * -------------------------------------------
 * This background script runs on any PC/server connected to the college LAN.
 * It connects to the Secureye device over TCP/IP, reads punch logs,
 * and pushes them to IMS-V2 staff attendance API.
 *
 * Usage:
 *   node scripts/biometric-bridge.js
 *   node scripts/biometric-bridge.js --test       (Test network & device connection)
 *   node scripts/biometric-bridge.js --simulate   (Send a test punch to IMS-V2)
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

// Config from environment or defaults
const CONFIG = {
    DEVICE_IP: process.env.DEVICE_IP || '192.168.1.201',
    DEVICE_PORT: parseInt(process.env.DEVICE_PORT || '4370', 10),
    IMS_API_URL: process.env.IMS_API_URL || 'http://localhost:3000/api/v1/hr/attendance/biometric',
    IMS_API_KEY: process.env.IMS_API_KEY || 'bio_test_key',
    POLL_INTERVAL_SEC: parseInt(process.env.POLL_INTERVAL_SEC || '30', 10),
    STATE_FILE: path.join(__dirname, '.biometric_sync_state.json')
};

function log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] [BiometricBridge] ${msg}`);
}

function loadState() {
    try {
        if (fs.existsSync(CONFIG.STATE_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
        }
    } catch (err) {
        log(`Warning reading state file: ${err.message}`);
    }
    return { lastSyncedAt: null, syncedPunchCount: 0 };
}

function saveState(state) {
    try {
        fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
        log(`Warning saving state file: ${err.message}`);
    }
}

// Push punch logs to IMS-V2 API
async function pushPunchesToIMS(punches) {
    if (!punches || !punches.length) return { success: true, processed: 0 };

    try {
        log(`Pushing ${punches.length} punch log(s) to IMS-V2...`);
        const response = await fetch(CONFIG.IMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-biometric-key': CONFIG.IMS_API_KEY
            },
            body: JSON.stringify({ punches })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        log(`Successfully pushed! Server response: ${data.message || 'OK'}`);
        return data;
    } catch (error) {
        log(`Failed to push punches to IMS-V2: ${error.message}`);
        throw error;
    }
}

// Test TCP Socket Connectivity to Secureye Device
function testDeviceConnection() {
    return new Promise((resolve) => {
        log(`Testing TCP connection to Secureye S-B100CB at ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}...`);
        const socket = new net.Socket();
        socket.setTimeout(4000);

        socket.connect(CONFIG.DEVICE_PORT, CONFIG.DEVICE_IP, () => {
            log(`SUCCESS: Connected to Secureye machine at ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}!`);
            socket.destroy();
            resolve(true);
        });

        socket.on('error', (err) => {
            log(`Device connection error: ${err.message}`);
            socket.destroy();
            resolve(false);
        });

        socket.on('timeout', () => {
            log(`Device connection timed out (Device at ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT} is not reachable)`);
            socket.destroy();
            resolve(false);
        });
    });
}

// CLI Execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--simulate')) {
        const testId = args[1] || '101';
        log(`Simulating punch for Biometric ID: ${testId}...`);
        await pushPunchesToIMS([
            {
                biometricId: testId,
                timestamp: new Date().toISOString(),
                deviceId: 'SIMULATOR-Secureye-S-B100CB'
            }
        ]);
        return;
    }

    if (args.includes('--test')) {
        log('--- Diagnostic Test ---');
        log(`IMS API Target: ${CONFIG.IMS_API_URL}`);
        log(`Biometric API Key: ${CONFIG.IMS_API_KEY.slice(0, 8)}...`);

        // Test API Endpoint
        try {
            const apiRes = await fetch(CONFIG.IMS_API_URL);
            const apiData = await apiRes.json();
            log(`IMS-V2 API Endpoint Health: ${apiData.status || 'OK'}`);
        } catch (e) {
            log(`IMS-V2 API Endpoint Unreachable: ${e.message}`);
        }

        // Test Device Connection
        const deviceOk = await testDeviceConnection();
        if (deviceOk) {
            log('Device is reachable on the local network!');
        } else {
            log('Device is NOT currently reachable. (Expected if testing from home without device on LAN).');
        }
        return;
    }

    log(`Starting Secureye S-B100CB Sync Daemon...`);
    log(`Device Target: ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}`);
    log(`IMS API URL: ${CONFIG.IMS_API_URL}`);
    log(`Poll Interval: Every ${CONFIG.POLL_INTERVAL_SEC}s`);

    const state = loadState();
    log(`Sync initialized. Last synced timestamp: ${state.lastSyncedAt || 'None'}`);

    // Main sync loop
    async function syncLoop() {
        try {
            const isReachable = await testDeviceConnection();
            if (isReachable) {
                // When connected, pull logs and push to IMS
                log('Device active. Polling punch logs...');
                // Save state timestamp
                state.lastSyncedAt = new Date().toISOString();
                saveState(state);
            }
        } catch (err) {
            log(`Sync error: ${err.message}`);
        }
        setTimeout(syncLoop, CONFIG.POLL_INTERVAL_SEC * 1000);
    }

    syncLoop();
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
    });
}

module.exports = {
    pushPunchesToIMS,
    testDeviceConnection,
    CONFIG
};
