#!/usr/bin/env node
'use strict';

/**
 * Antigravity Custom Theme Daemon (Windows / macOS / Linux)
 * Connects to Antigravity CDP (DevToolsActivePort), injects dist/theme_payload.js,
 * persists user theme preferences in theme_config.json, and hot-reloads on rebuild.
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
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
const ENGINE_DIR = path.join(ROOT_DIR, 'engine');
const THEMES_DIR = path.join(ROOT_DIR, 'themes');
const ASSETS_DIR = path.join(THEMES_DIR, 'assets');
const USER_MEDIA_DIR = path.join(THEMES_DIR, 'user_media');
const THEMES_JSON_PATH = path.join(THEMES_DIR, 'themes.json');
const PRELAUNCH_HTML_PATH = path.join(THEMES_DIR, 'prelaunch_boot.html');
const PAYLOAD_PATH = path.join(DIST_DIR, 'theme_payload.js');
const LOG_FILE = path.join(ROOT_DIR, 'daemon.log');
const MEDIA_HOST = '127.0.0.1';
const MEDIA_PORT = parseInt(process.env.AGY_MEDIA_PORT || '', 10) || 47821;
const MEDIA_BASE_URL = `http://${MEDIA_HOST}:${MEDIA_PORT}`;
const DEFAULT_CONFIG = {};
const DEFAULT_BOOT_ASSETS = {
    starfieldBg: 'assets/starfield-boot-bg.jpg',
    agyColorIcon: 'assets/agy-icon-color.png',
    voice1: 'assets/voice/tawa_voice1.mp3',
    voice2: 'assets/voice/tawa_voice2.mp3',
    voice3: 'assets/voice/tawa_voice3.mp3',
    voice4: 'assets/voice/tawa_voice4.mp3',
    greetingFontVi: 'assets/fonts/mali-500-vi.woff2',
    greetingFontLatinExt: 'assets/fonts/mali-500-latin-ext.woff2',
    greetingFontLatin: 'assets/fonts/mali-500-latin.woff2',
};

const PRELAUNCH_DONE_TTL_MS = 20000;
const PRELAUNCH_ACTIVE_TTL_MS = 120000;
let prelaunchDoneAt = 0;
let prelaunchStartedAt = 0;

function prelaunchRecentlyDone() {
    return prelaunchDoneAt > 0 && (Date.now() - prelaunchDoneAt) < PRELAUNCH_DONE_TTL_MS;
}

function isPrelaunchInFlight() {
    return prelaunchStartedAt > 0 && prelaunchStartedAt > prelaunchDoneAt && (Date.now() - prelaunchStartedAt) < PRELAUNCH_ACTIVE_TTL_MS;
}

function buildPrebootCurtainSource(cfg) {
    if (!cfg || cfg.bootIntro === false || cfg.themeMode === 'static') {
        return '';
    }
    return `(() => {
  try {
    if (window.__AGY_BOOT_PLAYED__ || window.__AGY_BOOT_FINISHED__) return;
    if (localStorage.getItem('agy_boot_intro_v1') === 'false' || localStorage.getItem('agy_theme_mode_v1') === 'static') return;
    if (document.getElementById('agy-boot-overlay') || document.getElementById('agy-preboot-curtain')) return;
    const st = document.createElement('style');
    st.id = 'agy-preboot-curtain';
    st.textContent = 'html{background:#040508!important;}body{opacity:0!important;transition:none!important;}';
    const host = document.head || document.documentElement;
    if (host) host.appendChild(st);
    let cleaned = false;
    let obs = null;
    let failSafe = null;
    const removeCurtain = () => {
      if (cleaned) return;
      cleaned = true;
      if (obs) { try { obs.disconnect(); } catch (_) {} obs = null; }
      if (failSafe) { clearTimeout(failSafe); failSafe = null; }
      const el = document.getElementById('agy-preboot-curtain');
      if (el) el.remove();
    };
    const checkReady = () => {
      if (document.getElementById('agy-boot-overlay') || window.__AGY_BOOT_FINISHED__) {
        removeCurtain();
        return true;
      }
      return false;
    };
    if (!checkReady() && document.documentElement) {
      obs = new MutationObserver(() => { checkReady(); });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      failSafe = setTimeout(removeCurtain, 2500);
    }
  } catch (_) {}
})();`;
}

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
    const suppressBootPrefix = (prelaunchRecentlyDone() || isPrelaunchInFlight())
        ? 'window.__AGY_BOOT_PLAYED__ = true;\nwindow.__AGY_BOOT_FINISHED__ = true;\nwindow.__AGY_INTRO_SHOWN_ONCE__ = true;\n'
        : '';
    return `window.__AGY_MEDIA_BASE_URL__ = ${JSON.stringify(MEDIA_BASE_URL)};\nwindow.__AGY_INITIAL_CONFIG__ = ${cfgJson};\n${suppressBootPrefix}${payloadCode}`;
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
                expression: 'delete window.agySaveThemeConfig; delete window.agyDesignTheme; delete window.agyDesignThemeV2; delete window.agyYtSearch; delete window.agyYtResolve;',
                awaitPromise: false,
            });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agySaveThemeConfig' });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agyDesignThemeV2' });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agyYtSearch' });
        } catch (_) {}
        try {
            await send('Runtime.addBinding', { name: 'agyYtResolve' });
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

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agyYtSearch') {
            let job = null;
            try { job = JSON.parse(msg.params.payload || '{}'); } catch (_) {}
            if (job && job.id && job.q) {
                const reply = (obj) => {
                    const expr = `window.__AGY_YT_SEARCH_CB__ && window.__AGY_YT_SEARCH_CB__(${JSON.stringify(job.id)}, ${JSON.stringify(JSON.stringify(obj))})`;
                    send('Runtime.evaluate', { expression: expr }).catch(() => {});
                };
                searchYouTubeTracks(job.q)
                    .then((results) => reply({ ok: true, results }))
                    .catch((err) => reply({ ok: false, error: err.message }));
            }
            return;
        }

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agyYtResolve') {
            let job = null;
            try { job = JSON.parse(msg.params.payload || '{}'); } catch (_) {}
            if (job && job.id && job.v) {
                const reply = (obj) => {
                    const expr = `window.__AGY_YT_RESOLVE_CB__ && window.__AGY_YT_RESOLVE_CB__(${JSON.stringify(job.id)}, ${JSON.stringify(JSON.stringify(obj))})`;
                    send('Runtime.evaluate', { expression: expr }).catch(() => {});
                };
                resolveYtAudioStream(job.v, false)
                    .then((info) => reply({ ok: true, url: info.url, durationSec: info.durationSec }))
                    .catch((err) => reply({ ok: false, error: err.message }));
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

            const cfg = readConfig();
            const curtainSrc = buildPrebootCurtainSource(cfg);
            if (curtainSrc) {
                await send('Page.addScriptToEvaluateOnNewDocument', { source: curtainSrc });
                await send('Runtime.evaluate', { expression: curtainSrc, awaitPromise: false });
            }

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
let scanInProgress = false;
async function scanPages() {
    if (scanInProgress) return;
    scanInProgress = true;
    try {
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
            url.startsWith('about:') ||
            url.includes(`:${MEDIA_PORT}/prelaunch_boot.html`)
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
    } finally {
        scanInProgress = false;
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

const MEDIA_MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.woff2': 'font/woff2',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
};

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
let mediaServer = null;
const ytStreamCache = new Map();

function ytPostJson(apiPath, payload, userAgent) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = https.request({
            hostname: 'www.youtube.com',
            path: apiPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            },
        }, (res) => {
            let buf = '';
            res.on('data', (c) => { buf += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(buf)); } catch (err) { reject(err); }
            });
        });
        req.setTimeout(12000, () => req.destroy(new Error('YouTube API timeout')));
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function parseDurationText(text) {
    if (!text) return 0;
    const parts = String(text).trim().split(':').map((n) => parseInt(n, 10));
    if (parts.some((n) => !Number.isFinite(n))) return 0;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function extractYouTubeId(input) {
    const raw = String(input || '').trim();
    const m = raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    return '';
}

async function searchYouTubeTracks(rawQuery) {
    const q = String(rawQuery || '').trim();
    if (!q) return [];
    const directId = extractYouTubeId(q);
    if (directId) {
        try {
            const info = await resolveYtAudioStream(directId, false);
            return [{
                videoId: info.videoId,
                title: info.title,
                author: info.author,
                durationSec: info.durationSec,
                durationText: info.durationSec ? `${Math.floor(info.durationSec / 60)}:${String(info.durationSec % 60).padStart(2, '0')}` : '',
                thumbnail: `https://i.ytimg.com/vi/${info.videoId}/mqdefault.jpg`,
            }];
        } catch (_) {
            return [{
                videoId: directId,
                title: `YouTube (${directId})`,
                author: 'YouTube',
                durationSec: 0,
                durationText: '',
                thumbnail: `https://i.ytimg.com/vi/${directId}/mqdefault.jpg`,
            }];
        }
    }
    const searchRes = await ytPostJson('/youtubei/v1/search?prettyPrint=false', {
        context: { client: { clientName: 'WEB', clientVersion: '2.20241126.01.00', hl: 'vi', gl: 'VN' } },
        query: q,
    });
    const contents = searchRes?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];
    for (const sec of contents) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const item of items) {
            const v = item?.videoRenderer;
            if (!v || !v.videoId) continue;
            const durationText = v.lengthText?.simpleText || '';
            if (!durationText) continue;
            const thumbs = v.thumbnail?.thumbnails;
            const thumbUrl = (Array.isArray(thumbs) && thumbs.length > 0 && thumbs[0]?.url)
                ? thumbs[0].url
                : `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`;
            results.push({
                videoId: v.videoId,
                title: v.title?.runs?.map((r) => r.text).join('') || v.videoId,
                author: v.ownerText?.runs?.map((r) => r.text).join('') || '',
                durationText,
                durationSec: parseDurationText(durationText),
                thumbnail: thumbUrl,
            });
            if (results.length >= 8) break;
        }
        if (results.length >= 8) break;
    }
    return results;
}

async function resolveYtAudioStream(videoId, forceRefresh) {
    const now = Date.now();
    if (!forceRefresh) {
        const cached = ytStreamCache.get(videoId);
        if (cached && cached.expiresAt > now) return cached;
    }
    const vrUa = 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip';
    const data = await ytPostJson('/youtubei/v1/player?prettyPrint=false', {
        context: {
            client: {
                clientName: 'ANDROID_VR',
                clientVersion: '1.60.19',
                deviceMake: 'Oculus',
                deviceModel: 'Quest 3',
                osName: 'Android',
                osVersion: '12L',
                androidSdkVersion: 32,
            },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
    }, vrUa);
    if (data?.playabilityStatus?.status !== 'OK') {
        throw new Error(data?.playabilityStatus?.reason || data?.playabilityStatus?.status || 'Video unavailable');
    }
    const adaptive = Array.isArray(data?.streamingData?.adaptiveFormats) ? data.streamingData.adaptiveFormats : [];
    const audios = adaptive
        .filter((f) => f && f.mimeType && f.mimeType.startsWith('audio/') && f.url)
        .sort((a, b) => {
            const aMp4 = a.mimeType.includes('audio/mp4') ? 1 : 0;
            const bMp4 = b.mimeType.includes('audio/mp4') ? 1 : 0;
            if (aMp4 !== bMp4) return bMp4 - aMp4;
            return (b.bitrate || 0) - (a.bitrate || 0);
        });
    const chosen = audios[0];
    if (!chosen || !chosen.url) {
        throw new Error('No direct audio stream found');
    }
    const info = {
        videoId,
        url: chosen.url,
        mimeType: String(chosen.mimeType).split(';')[0] || 'audio/mp4',
        title: data?.videoDetails?.title || videoId,
        author: data?.videoDetails?.author || '',
        durationSec: parseInt(data?.videoDetails?.lengthSeconds || '0', 10) || 0,
        expiresAt: now + 90 * 60 * 1000,
    };
    ytStreamCache.set(videoId, info);
    return info;
}

function proxyYtAudio(req, res, streamInfo, allowRetry) {
    const u = new URL(streamInfo.url);
    const headers = {
        'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    };
    if (req.headers.range) headers.Range = req.headers.range;
    const upReq = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers,
    }, async (upRes) => {
        if ((upRes.statusCode === 403 || upRes.statusCode === 410) && allowRetry) {
            upRes.resume();
            try {
                const fresh = await resolveYtAudioStream(streamInfo.videoId, true);
                proxyYtAudio(req, res, fresh, false);
            } catch (err) {
                if (!res.headersSent) sendJson(res, 502, { ok: false, error: err.message });
            }
            return;
        }
        const outHeaders = {
            'Content-Type': upRes.headers['content-type'] || streamInfo.mimeType || 'audio/mp4',
            'Accept-Ranges': upRes.headers['accept-ranges'] || 'bytes',
            'Cache-Control': 'no-store',
        };
        if (upRes.headers['content-length']) outHeaders['Content-Length'] = upRes.headers['content-length'];
        if (upRes.headers['content-range']) outHeaders['Content-Range'] = upRes.headers['content-range'];
        res.writeHead(upRes.statusCode || 200, outHeaders);
        upRes.pipe(res);
    });
    upReq.setTimeout(20000, () => upReq.destroy(new Error('Stream timeout')));
    upReq.on('error', (err) => {
        if (!res.headersSent) sendJson(res, 502, { ok: false, error: err.message });
    });
    req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
    upReq.end();
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, data) {
    const body = Buffer.from(JSON.stringify(data), 'utf8');
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
    });
    res.end(body);
}

function resolveSafeSubpath(baseDir, relPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(String(relPath || ''));
    } catch (_) {
        return null;
    }
    const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('\0')) return null;
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(resolvedBase, normalized);
    const rel = path.relative(resolvedBase, resolvedTarget);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
        return null;
    }
    return resolvedTarget;
}

function serveStaticFile(req, res, filePath, cacheControl) {
    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch (_) {
        sendJson(res, 404, { ok: false, error: 'Not found' });
        return;
    }
    if (!stat.isFile()) {
        sendJson(res, 404, { ok: false, error: 'Not found' });
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MEDIA_MIME_TYPES[ext] || 'application/octet-stream';
    const total = stat.size;
    const baseHeaders = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
    };
    if (cacheControl) {
        baseHeaders['Cache-Control'] = cacheControl;
    }

    const rangeHeader = req.headers.range;
    if (rangeHeader && total > 0) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
        if (!match || (match[1] === '' && match[2] === '')) {
            res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${total}` });
            res.end();
            return;
        }
        let start;
        let end;
        if (match[1] === '') {
            const suffix = parseInt(match[2], 10);
            start = Math.max(0, total - suffix);
            end = total - 1;
        } else {
            start = parseInt(match[1], 10);
            end = match[2] ? Math.min(total - 1, parseInt(match[2], 10)) : total - 1;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= total) {
            res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${total}` });
            res.end();
            return;
        }
        res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': end - start + 1,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
    }

    res.writeHead(200, {
        ...baseHeaders,
        'Content-Length': total,
    });
    fs.createReadStream(filePath).pipe(res);
}

function listUserMedia() {
    const files = [];
    const images = [];
    const videos = [];
    const audios = [];
    try {
        if (!fs.existsSync(USER_MEDIA_DIR)) {
            return { files, images, videos, audios };
        }
        const entries = fs.readdirSync(USER_MEDIA_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            const name = entry.name;
            files.push(name);
            const ext = path.extname(name).toLowerCase();
            const relUrl = `user_media/${name}`;
            if (['.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif', '.svg'].includes(ext)) {
                images.push(relUrl);
            } else if (['.mp4', '.webm', '.mov'].includes(ext)) {
                videos.push(relUrl);
            } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
                audios.push(relUrl);
            }
        }
    } catch (err) {
        log(`Failed listing user_media: ${err.message}`);
    }
    return { files, images, videos, audios };
}

function readRequestBody(req, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        let settled = false;
        req.on('data', (chunk) => {
            if (settled) return;
            total += chunk.length;
            if (total > maxBytes) {
                settled = true;
                req.destroy();
                reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            if (!settled) {
                settled = true;
                resolve(Buffer.concat(chunks));
            }
        });
        req.on('error', (err) => {
            if (!settled) {
                settled = true;
                reject(err);
            }
        });
    });
}

function sanitizeUploadFilename(rawName) {
    let base = '';
    try {
        base = path.basename(decodeURIComponent(String(rawName || '')));
    } catch (_) {
        base = path.basename(String(rawName || ''));
    }
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
    return cleaned || `upload_${Date.now()}.bin`;
}

async function handleMediaRequest(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let reqUrl;
    try {
        reqUrl = new URL(req.url || '/', MEDIA_BASE_URL);
    } catch (_) {
        sendJson(res, 400, { ok: false, error: 'Invalid URL' });
        return;
    }

    const pathname = reqUrl.pathname;

    if (req.method === 'GET' && pathname.startsWith('/assets/')) {
        const rel = pathname.slice('/assets/'.length);
        const filePath = resolveSafeSubpath(ASSETS_DIR, rel);
        if (!filePath) {
            sendJson(res, 403, { ok: false, error: 'Forbidden' });
            return;
        }
        serveStaticFile(req, res, filePath, 'no-store, no-cache, must-revalidate');
        return;
    }

    if (req.method === 'GET' && (pathname === '/engine/boot.js' || pathname === '/engine/reveal.js')) {
        const fileName = pathname.slice('/engine/'.length);
        const filePath = resolveSafeSubpath(ENGINE_DIR, fileName);
        if (!filePath) {
            sendJson(res, 403, { ok: false, error: 'Forbidden' });
            return;
        }
        serveStaticFile(req, res, filePath, 'no-cache');
        return;
    }

    if (req.method === 'GET' && pathname.startsWith('/user_media/')) {
        const rel = pathname.slice('/user_media/'.length);
        const filePath = resolveSafeSubpath(USER_MEDIA_DIR, rel);
        if (!filePath) {
            sendJson(res, 403, { ok: false, error: 'Forbidden' });
            return;
        }
        serveStaticFile(req, res, filePath, 'no-store, no-cache, must-revalidate');
        return;
    }

    if (req.method === 'GET' && pathname === '/user_media_list') {
        const media = listUserMedia();
        sendJson(res, 200, { ok: true, ...media });
        return;
    }

    if (req.method === 'POST' && pathname === '/upload') {
        try {
            const body = await readRequestBody(req, MAX_UPLOAD_BYTES);
            const rawName = reqUrl.searchParams.get('name') || req.headers['x-file-name'] || '';
            const safeName = sanitizeUploadFilename(rawName);
            fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
            const targetPath = resolveSafeSubpath(USER_MEDIA_DIR, safeName);
            if (!targetPath) {
                sendJson(res, 403, { ok: false, error: 'Forbidden filename' });
                return;
            }
            fs.writeFileSync(targetPath, body);
            const media = listUserMedia();
            sendJson(res, 200, {
                ok: true,
                file: safeName,
                url: `user_media/${safeName}`,
                media,
            });
        } catch (err) {
            sendJson(res, err.statusCode || 500, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === 'POST' && pathname === '/delete_media') {
        try {
            const raw = await readRequestBody(req, 1024 * 1024);
            let parsed = {};
            try {
                parsed = JSON.parse(raw.toString('utf8') || '{}');
            } catch (_) {
                sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
                return;
            }
            let target = String(parsed.url || parsed.file || parsed.name || '').trim();
            target = target.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');
            if (target.startsWith('user_media/')) {
                target = target.slice('user_media/'.length);
            }
            if (!target || target.includes('/') || target.includes('\\')) {
                sendJson(res, 400, { ok: false, error: 'Invalid media target' });
                return;
            }
            const targetPath = resolveSafeSubpath(USER_MEDIA_DIR, target);
            if (!targetPath) {
                sendJson(res, 403, { ok: false, error: 'Forbidden' });
                return;
            }
            if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
                fs.unlinkSync(targetPath);
            }
            const media = listUserMedia();
            sendJson(res, 200, { ok: true, deleted: target, media });
        } catch (err) {
            sendJson(res, err.statusCode || 500, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === 'GET' && pathname === '/prelaunch_boot.html') {
        if (!fs.existsSync(PRELAUNCH_HTML_PATH)) {
            sendJson(res, 404, { ok: false, error: 'prelaunch_boot.html not found' });
            return;
        }
        prelaunchStartedAt = Date.now();
        let builtinThemes = {};
        try {
            if (fs.existsSync(THEMES_JSON_PATH)) {
                const parsed = JSON.parse(fs.readFileSync(THEMES_JSON_PATH, 'utf8'));
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    builtinThemes = parsed;
                }
            }
        } catch (err) {
            log(`Failed reading themes.json for prelaunch: ${err.message}`);
        }
        const cfg = readConfig();
        const mergedThemes = {
            ...builtinThemes,
            ...(cfg.customThemes && typeof cfg.customThemes === 'object' && !Array.isArray(cfg.customThemes) ? cfg.customThemes : {}),
        };
        const bootstrapJson = JSON.stringify({
            mediaBaseUrl: MEDIA_BASE_URL,
            config: cfg,
            themes: mergedThemes,
            bootAssets: DEFAULT_BOOT_ASSETS,
        }).replace(/</g, '\\u003c');
        let html = fs.readFileSync(PRELAUNCH_HTML_PATH, 'utf8');
        const placeholder = '/*__PRELAUNCH_BOOTSTRAP__*/{}';
        if (html.includes(placeholder)) {
            html = html.replace(placeholder, () => bootstrapJson);
        }
        const body = Buffer.from(html, 'utf8');
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': body.length,
            'Cache-Control': 'no-store',
        });
        res.end(body);
        return;
    }

    if (req.method === 'POST' && pathname === '/prelaunch_done') {
        try {
            await readRequestBody(req, 64 * 1024);
        } catch (_) {}
        prelaunchDoneAt = Date.now();
        prelaunchStartedAt = 0;
        const dismissExpr = `(() => {
  try {
    window.__AGY_BOOT_PLAYED__ = true;
    window.__AGY_BOOT_FINISHED__ = true;
    window.__AGY_INTRO_SHOWN_ONCE__ = true;
    const curtain = document.getElementById('agy-preboot-curtain');
    if (curtain) curtain.remove();
    if (document.getElementById('agy-boot-overlay') && window.__AGY_INTERNAL__ && typeof window.__AGY_INTERNAL__.teardownBootOverlay === 'function') {
      window.__AGY_INTERNAL__.teardownBootOverlay();
      if (typeof window.__AGY_INTERNAL__.scheduleRevealWhenReady === 'function') {
        window.__AGY_INTERNAL__.scheduleRevealWhenReady(true);
      }
    }
  } catch (_) {}
})();`;
        for (const s of sessions.values()) {
            s.evalExpr && s.evalExpr(dismissExpr);
        }
        sendJson(res, 200, { ok: true, prelaunchDoneAt });
        return;
    }

    if (req.method === 'GET' && pathname === '/api/yt-search') {
        const q = String(reqUrl.searchParams.get('q') || '').trim();
        if (!q) {
            sendJson(res, 400, { ok: false, error: 'Missing q' });
            return;
        }
        try {
            const results = await searchYouTubeTracks(q);
            sendJson(res, 200, { ok: true, results });
        } catch (err) {
            sendJson(res, 500, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === 'GET' && pathname === '/api/yt-stream') {
        const videoId = extractYouTubeId(reqUrl.searchParams.get('v') || '');
        if (!videoId) {
            sendJson(res, 400, { ok: false, error: 'Invalid video id' });
            return;
        }
        try {
            const info = await resolveYtAudioStream(videoId, false);
            proxyYtAudio(req, res, info, true);
        } catch (err) {
            sendJson(res, 502, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === 'GET' && pathname === '/prelaunch_status') {
        const cfg = readConfig();
        sendJson(res, 200, {
            ok: true,
            prelaunchDoneAt,
            prelaunchStartedAt,
            prelaunchRecentlyDone: prelaunchRecentlyDone(),
            inFlight: isPrelaunchInFlight(),
            bootIntro: cfg.bootIntro !== false,
            themeMode: cfg.themeMode || 'dynamic',
        });
        return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
}

function startMediaServer() {
    if (mediaServer) return mediaServer;
    const server = http.createServer((req, res) => {
        handleMediaRequest(req, res).catch((err) => {
            log(`Media server request error: ${err.message}`);
            if (!res.headersSent) {
                sendJson(res, 500, { ok: false, error: 'Internal server error' });
            }
        });
    });

    server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            log(`Media server port ${MEDIA_PORT} already in use (EADDRINUSE); continuing without binding media server.`);
            return;
        }
        log(`Media server error: ${err.message}`);
    });

    server.listen(MEDIA_PORT, MEDIA_HOST, () => {
        log(`Media server listening on ${MEDIA_BASE_URL}`);
    });
    mediaServer = server;
    return server;
}

function shutdown(signal) {
    log(`Shutting down on ${signal}.`);
    if (mediaServer) {
        try {
            mediaServer.close();
        } catch (_) {}
        mediaServer = null;
    }
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
startMediaServer();
watchPayload();
async function scheduleScanLoop() {
    try {
        await scanPages();
    } catch (_) {}
    const delayMs = sessions.size === 0 ? 100 : 400;
    setTimeout(scheduleScanLoop, delayMs);
}
scheduleScanLoop();
startAutoUpdater();
