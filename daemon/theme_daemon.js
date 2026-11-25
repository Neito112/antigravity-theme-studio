#!/usr/bin/env node
'use strict';

/**
 * Antigravity Custom Theme Daemon (Windows / macOS / Linux)
 * Connects to Antigravity CDP (DevToolsActivePort), injects dist/theme_payload.js,
 * persists user theme preferences in theme_config.json, and hot-reloads on rebuild.
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');

if (typeof globalThis.WebSocket !== 'function') {
    console.error('[theme-daemon] Node.js >= 22 with built-in WebSocket is required.');
    process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT_DIR, 'daemon.pid');
const { designTheme } = require('./theme_designer');
const CONFIG_FILE = process.env.AGY_CONFIG_PATH || path.join(ROOT_DIR, 'theme_config.json');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PAYLOAD_PATH = path.join(DIST_DIR, 'theme_payload.js');
const LOG_FILE = path.join(ROOT_DIR, 'daemon.log');
const DEFAULT_CONFIG = {};

function resolvePortFile() {
    if (process.env.AGY_PORT_FILE) {
        return process.env.AGY_PORT_FILE;
    }

    const home = os.homedir();
    let candidates;
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
        candidates = [
            path.join(appData, 'antigravity', 'DevToolsActivePort'),
            path.join(appData, 'Antigravity', 'DevToolsActivePort'),
        ];
    } else if (process.platform === 'darwin') {
        const appSupport = path.join(home, 'Library', 'Application Support');
        candidates = [
            path.join(appSupport, 'antigravity', 'DevToolsActivePort'),
            path.join(appSupport, 'Antigravity', 'DevToolsActivePort'),
        ];
    } else {
        const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
        candidates = [
            path.join(xdgConfig, 'antigravity', 'DevToolsActivePort'),
            path.join(xdgConfig, 'Antigravity', 'DevToolsActivePort'),
        ];
    }

    return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try {
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 512 * 1024) {
            fs.writeFileSync(LOG_FILE, '');
        }
        fs.appendFileSync(LOG_FILE, line);
    } catch (_) {}
    if (process.stdout.isTTY || process.env.AGY_DAEMON_STDOUT === '1') {
        process.stdout.write(line);
    }
}

function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (_) {
        return false;
    }
}

function acquirePidLock() {
    if (fs.existsSync(PID_FILE)) {
        const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        if (existingPid && existingPid !== process.pid && isPidAlive(existingPid)) {
            log(`Another daemon instance is already running (PID ${existingPid}). Exiting.`);
            process.exit(0);
        }
    }
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
}

function removePidLock() {
    try {
        if (fs.existsSync(PID_FILE)) {
            const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
            if (pid === process.pid) {
                fs.unlinkSync(PID_FILE);
            }
        }
    } catch (_) {}
}

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (parsed && typeof parsed === 'object') {
                return { ...DEFAULT_CONFIG, ...parsed };
            }
        }
    } catch (err) {
        log(`Failed reading theme_config.json: ${err.message}`);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(next) {
    try {
        const merged = { ...readConfig(), ...next };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
        return merged;
    } catch (err) {
        log(`Failed saving theme_config.json: ${err.message}`);
        return null;
    }
}

let missingPayloadLogged = false;
function buildInjectedSource() {
    if (!fs.existsSync(PAYLOAD_PATH)) {
        if (!missingPayloadLogged) {
            log(`Payload not built yet (${PAYLOAD_PATH}). Run: python scripts/build_payload.py`);
            missingPayloadLogged = true;
        }
        return null;
    }
    missingPayloadLogged = false;

    const cfgJson = JSON.stringify(readConfig());
    const payloadCode = fs.readFileSync(PAYLOAD_PATH, 'utf8');
    return `window.__AGY_INITIAL_CONFIG__ = ${cfgJson};\n${payloadCode}`;
}

function getPortInfo() {
    const portFile = resolvePortFile();
    if (fs.existsSync(portFile)) {
        const lines = fs
            .readFileSync(portFile, 'utf8')
            .trim()
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        const port = parseInt(lines[0], 10);
        if (Number.isFinite(port) && port > 0) {
            return { port, token: lines[1] || '', source: portFile };
        }
    }
    const envPort = parseInt(process.env.AGY_CDP_PORT || '', 10);
    if (Number.isFinite(envPort) && envPort > 0) {
        return { port: envPort, token: '', source: 'AGY_CDP_PORT' };
    }
    return { port: 9222, token: '', source: 'fallback:9222', isFallback: true };
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 2000 }, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(err);
                }
            });
        });
        req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
        req.on('error', reject);
    });
}

const sessions = new Map();
let lastPort = null;
let reloadTimer = null;

function createSession(target) {
    const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
    let nextId = 1;
    const pending = new Map();
    const session = { id: target.id, ws, target };
    sessions.set(target.id, session);

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== 1) {
                reject(new Error('WebSocket is not open'));
                return;
            }
            const id = nextId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    session.evalExpr = async (expression) => {
        try {
            await send('Runtime.evaluate', { expression, awaitPromise: false });
        } catch (_) {}
    };

    async function ensureBindings() {
        try {
            await send('Runtime.evaluate', {
                expression: 'delete window.agySaveThemeConfig; delete window.agyDesignTheme; delete window.agyDesignThemeV2;',
                awaitPromise: false,
            });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agySaveThemeConfig' });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agyDesignThemeV2' });
        } catch (_) {}
    }

    let reinjecting = false;
    session.reinject = async () => {
        if (reinjecting) return;
        const src = buildInjectedSource();
        if (!src) return;
        reinjecting = true;
        try {
            await ensureBindings();
            await send('Runtime.evaluate', { expression: src, awaitPromise: false });
        } catch (_) {
        } finally {
            reinjecting = false;
        }
    };

    session.ensureHealthy = async () => {
        if (ws.readyState !== 1 || reinjecting) return;
        try {
            const res = await send('Runtime.evaluate', {
                expression: "Boolean(document.getElementById('antigravity-custom-theme-active') && document.getElementById('agy-custom-theme-topbar-btn'))",
                returnByValue: true,
                awaitPromise: false,
            });
            if (!res || !res.result || res.result.value !== true) {
                log(`Self-healing target ${target.id} (theme or topbar button missing).`);
                await session.reinject();
            }
        } catch (_) {}
    };

    ws.addEventListener('message', async (event) => {
        let msg;
        try {
            msg = JSON.parse(String(event.data));
        } catch (_) {
            return;
        }

        if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message || 'CDP error'));
            else p.resolve(msg.result);
            return;
        }

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agySaveThemeConfig') {
            try {
                const payload = JSON.parse(msg.params.payload || '{}');
                const merged = saveConfig(payload);
                const syncExpr = merged
                    ? `window.__AGY_INITIAL_CONFIG__ = ${JSON.stringify(merged)};`
                    : '';
                for (const other of sessions.values()) {
                    if (other.id !== target.id) {
                        if (syncExpr) {
                            other.evalExpr && other.evalExpr(syncExpr);
                        }
                        other.reinject();
                    }
                }
            } catch (err) {
                log(`Config binding error: ${err.message}`);
            }
            return;
        }

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agyDesignThemeV2') {
            let job = null;
            try {
                job = JSON.parse(msg.params.payload || '{}');
            } catch (_) {}
            if (job && job.id && job.image) {
                const reply = (obj) => {
                    const expr = `window.__AGY_DESIGN_RESULT_V2__ && window.__AGY_DESIGN_RESULT_V2__(${JSON.stringify(job.id)}, ${JSON.stringify(JSON.stringify(obj))})`;
                    send('Runtime.evaluate', { expression: expr }).catch(() => {});
                };
                designTheme(job.image, { log, width: job.width, height: job.height })
                    .then((res) => reply({
                        theme: res.theme,
                        wallpaperDataUrl: res.wallpaperDataUrl || '',
                        wpMeta: res.wpMeta || null,
                    }))
                    .catch((err) => {
                        log(`Theme design failed: ${err.message}`);
                        reply({ error: err.message });
                    });
            }
            return;
        }

        if (
            (msg.method === 'Page.frameNavigated' && msg.params && msg.params.frame && !msg.params.frame.parentId) ||
            msg.method === 'Page.loadEventFired' ||
            msg.method === 'Page.domContentEventFired'
        ) {
            await session.reinject();
        }
    });

    ws.addEventListener('open', async () => {
        try {
            await send('Page.enable');
            await send('Runtime.enable');
            await ensureBindings();

            const src = buildInjectedSource();
            if (src) {
                await send('Page.addScriptToEvaluateOnNewDocument', { source: src });
                await send('Runtime.evaluate', { expression: src, awaitPromise: false });
            }
            log(`Attached target ${target.id} (${target.url})`);
        } catch (err) {
            log(`Attach error for ${target.id}: ${err.message}`);
        }
    });

    const healthTimer = setInterval(() => {
        session.ensureHealthy();
    }, 10000);

    const cleanup = () => {
        clearInterval(healthTimer);
        for (const p of pending.values()) {
            p.reject(new Error('WebSocket closed'));
        }
        pending.clear();
        sessions.delete(target.id);
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
}

let missingCdpLogged = false;
async function scanPages() {
    const info = getPortInfo();
    if (!info) return;

    if (lastPort !== null && lastPort !== info.port) {
        for (const s of sessions.values()) {
            try {
                s.ws.close();
            } catch (_) {}
        }
        sessions.clear();
    }
    lastPort = info.port;

    let targets;
    try {
        targets = await fetchJson(`http://127.0.0.1:${info.port}/json`);
        missingCdpLogged = false;
    } catch (_) {
        if (!missingCdpLogged) {
            log(`Waiting for Antigravity CDP (${info.source}, port ${info.port}). Ensure Antigravity is running with DevToolsActivePort or --remote-debugging-port=9222.`);
            missingCdpLogged = true;
        }
        return;
    }
    if (!Array.isArray(targets)) return;

    const pages = targets.filter((t) => {
        if (!t || t.type !== 'page' || !t.webSocketDebuggerUrl) return false;
        const url = String(t.url || '');
        if (
            !url ||
            url.startsWith('devtools://') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('data:') ||
            url.startsWith('about:')
        ) {
            return false;
        }
        return (
            url.includes('127.0.0.1') ||
            url.includes('localhost') ||
            url.includes('workbench') ||
            url.includes('launchpad') ||
            url.startsWith('vscode-file://') ||
            url.startsWith('antigravity://')
        );
    });

    const liveIds = new Set(pages.map((p) => p.id));
    for (const [id, session] of sessions.entries()) {
        if (!liveIds.has(id)) {
            try {
                session.ws.close();
            } catch (_) {}
            sessions.delete(id);
        }
    }

    for (const page of pages) {
        if (!sessions.has(page.id)) {
            createSession(page);
        }
    }
}

function watchPayload() {
    try {
        if (!fs.existsSync(DIST_DIR)) {
            fs.mkdirSync(DIST_DIR, { recursive: true });
        }
        fs.watch(DIST_DIR, (_eventType, filename) => {
            if (filename && filename !== 'theme_payload.js') return;
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                log('Detected dist/theme_payload.js update; hot-reloading attached pages.');
                for (const s of sessions.values()) {
                    s.reinject();
                }
            }, 250);
        });
    } catch (err) {
        log(`fs.watch skipped: ${err.message}`);
    }
}

function execAsync(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, {
            cwd: ROOT_DIR,
            windowsHide: true,
            timeout: opts.timeout || 25000,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
                GCM_INTERACTIVE: 'never',
            },
        }, (err, stdout, stderr) => {
            if (err) {
                err.stderr = stderr;
                err.stdout = stdout;
                reject(err);
            } else {
                resolve({ stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() });
            }
        });
    });
}

let updateInProgress = false;
let lastUpdateErr = '';
async function checkForUpdates() {
    if (updateInProgress || process.env.AGY_AUTO_UPDATE === '0') return;
    if (!fs.existsSync(path.join(ROOT_DIR, '.git'))) return;
    updateInProgress = true;
    try {
        const statusRes = await execAsync('git', ['status', '--porcelain', '--untracked-files=no'], { timeout: 10000 });
        if (statusRes.stdout) {
            return; // Skip auto-update when local tracked files are modified
        }

        await execAsync('git', ['fetch', '--quiet', 'origin'], { timeout: 25000 });
        const headRes = await execAsync('git', ['rev-parse', 'HEAD'], { timeout: 5000 });
        let upstreamRef = '@{u}';
        let remoteRes;
        try {
            remoteRes = await execAsync('git', ['rev-parse', upstreamRef], { timeout: 5000 });
        } catch (_) {
            upstreamRef = 'origin/main';
            remoteRes = await execAsync('git', ['rev-parse', upstreamRef], { timeout: 5000 });
        }

        const oldHead = headRes.stdout;
        const newHead = remoteRes.stdout;
        if (!oldHead || !newHead || oldHead === newHead) {
            lastUpdateErr = '';
            return;
        }

        log(`Auto-update: found new commit ${newHead.slice(0, 7)} (current ${oldHead.slice(0, 7)}). Pulling...`);
        await execAsync('git', ['pull', '--ff-only', '--quiet'], { timeout: 30000 });

        const diffRes = await execAsync('git', ['diff', '--name-only', oldHead, newHead], { timeout: 10000 });
        const changedFiles = diffRes.stdout.split(/\r?\n/).filter(Boolean);
        log(`Auto-update: pulled ${changedFiles.length} file(s): ${changedFiles.join(', ')}`);

        const buildScript = path.join(ROOT_DIR, 'scripts', 'build_payload.js');
        if (fs.existsSync(buildScript)) {
            await execAsync(process.execPath, [buildScript], { timeout: 30000 });
            log('Auto-update: rebuilt dist/theme_payload.js.');
        }

        lastUpdateErr = '';
        const needsDaemonRestart = changedFiles.some((f) => f === 'daemon/theme_daemon.js' || f === 'daemon/theme_designer.js');
        if (needsDaemonRestart) {
            log('Auto-update: daemon code changed; restarting daemon process...');
            for (const s of sessions.values()) {
                try { s.ws.close(); } catch (_) {}
            }
            sessions.clear();
            removePidLock();
            const child = spawn(process.execPath, [__filename], {
                cwd: ROOT_DIR,
                detached: true,
                stdio: 'ignore',
                windowsHide: true,
            });
            child.unref();
            process.exit(0);
        }
    } catch (err) {
        const msg = (err.stderr || err.message || String(err)).trim().split(/\r?\n/)[0];
        if (msg !== lastUpdateErr) {
            lastUpdateErr = msg;
            log(`Auto-update check skipped: ${msg}`);
        }
    } finally {
        updateInProgress = false;
    }
}

function startAutoUpdater() {
    if (process.env.AGY_AUTO_UPDATE === '0') {
        log('Auto-update disabled (AGY_AUTO_UPDATE=0).');
        return;
    }
    const rawInterval = parseInt(process.env.AGY_UPDATE_INTERVAL_MS || '', 10);
    const intervalMs = Number.isFinite(rawInterval) && rawInterval >= 60000 ? rawInterval : 30 * 60 * 1000;
    setTimeout(() => { checkForUpdates(); }, 10000);
    setInterval(() => { checkForUpdates(); }, intervalMs);
}

function shutdown(signal) {
    log(`Shutting down on ${signal}.`);
    for (const s of sessions.values()) {
        try {
            s.ws.close();
        } catch (_) {}
    }
    sessions.clear();
    removePidLock();
    process.exit(0);
}

acquirePidLock();
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', removePidLock);

log(`Theme daemon started (PID ${process.pid}, platform=${process.platform}, portFile=${resolvePortFile()}).`);
watchPayload();
scanPages();
setInterval(scanPages, 1500);
startAutoUpdater();
