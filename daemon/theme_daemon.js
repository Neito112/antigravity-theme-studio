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
const { generatePetVoiceClips } = require('./voice_generator');
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

let lastAppIconKey = '';
let appIconUpdateQueued = null;
let appIconUpdateRunning = false;

function buildIcoFromPngBuffer(pngBuf) {
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // ICO type
    header.writeUInt16LE(1, 4); // Image count
    header.writeUInt8(128, 6);  // Width
    header.writeUInt8(128, 7);  // Height
    header.writeUInt8(0, 8);    // Color palette count
    header.writeUInt8(0, 9);    // Reserved
    header.writeUInt16LE(1, 10); // Color planes
    header.writeUInt16LE(32, 12); // Bits per pixel
    header.writeUInt32LE(pngBuf.length, 14); // Image size
    header.writeUInt32LE(22, 18); // Offset to image data
    return Buffer.concat([header, pngBuf]);
}

function flushWindowsAppIconQueue() {
    if (appIconUpdateRunning || !appIconUpdateQueued) return;
    const item = appIconUpdateQueued;
    appIconUpdateQueued = null;
    appIconUpdateRunning = true;
    try {
        fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
        const pngPath = path.join(USER_MEDIA_DIR, 'active_app_icon.png');
        const icoPath = path.join(USER_MEDIA_DIR, 'active_app_icon.ico');
        const psPath = path.join(USER_MEDIA_DIR, 'apply_win_icon.ps1');
        fs.writeFileSync(pngPath, item.pngBuf);
        fs.writeFileSync(icoPath, buildIcoFromPngBuffer(item.pngBuf));

        if (process.platform === 'win32') {
            const psCode = `param([string]$PngPath, [string]$IcoPath)
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
$cs = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public static class AgyIconWin32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern IntPtr SendMessageTimeoutW(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
    [DllImport("shell32.dll")] public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
    public static int ApplyToAntigravity(IntPtr hSmall, IntPtr hBig) {
        int updated = 0;
        var pidCache = new Dictionary<uint, bool>();
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            bool match;
            if (!pidCache.TryGetValue(pid, out match)) {
                match = false;
                try {
                    using (var p = Process.GetProcessById((int)pid)) {
                        match = string.Equals(p.ProcessName, "Antigravity", StringComparison.OrdinalIgnoreCase);
                    }
                } catch {}
                pidCache[pid] = match;
            }
            if (!match) {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, sb.Capacity);
                if (sb.ToString().IndexOf("Antigravity", StringComparison.OrdinalIgnoreCase) >= 0 &&
                    sb.ToString().IndexOf("Prelaunch", StringComparison.OrdinalIgnoreCase) < 0) {
                    match = true;
                }
            }
            if (match) {
                IntPtr res;
                SendMessageTimeoutW(hWnd, 0x0080, (IntPtr)0, hSmall, 2, 600, out res);
                SendMessageTimeoutW(hWnd, 0x0080, (IntPtr)1, hBig, 2, 600, out res);
                updated++;
            }
            return true;
        }, IntPtr.Zero);
        return updated;
    }
}
"@
Add-Type -TypeDefinition $cs -Language CSharp | Out-Null
$bmp = New-Object System.Drawing.Bitmap($PngPath)
$bmpSmall = New-Object System.Drawing.Bitmap($bmp, 32, 32)
$bmpBig = New-Object System.Drawing.Bitmap($bmp, 128, 128)
$hSmall = $bmpSmall.GetHicon()
$hBig = $bmpBig.GetHicon()
[void][AgyIconWin32]::ApplyToAntigravity($hSmall, $hBig)
$bmpSmall.Dispose()
$bmpBig.Dispose()
$bmp.Dispose()

$WshShell = New-Object -ComObject WScript.Shell
$Dirs = @(
    [Environment]::GetFolderPath('DesktopDirectory'),
    [Environment]::GetFolderPath('Programs'),
    (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar')
) | Where-Object { $_ -and (Test-Path $_) }
$ChangedLnk = $false
foreach ($D in $Dirs) {
    Get-ChildItem -Path $D -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Name -ieq 'AntigravityCustomTheme.lnk') { return }
        try {
            $Sc = $WshShell.CreateShortcut($_.FullName)
            $IsAgy = ($Sc.Arguments -like '*launch-antigravity-themed.ps1*') -or ($Sc.TargetPath -imatch '\\\\Antigravity\\.exe$') -or ($Sc.IconLocation -like '*active_app_icon.ico*')
            if ($IsAgy) {
                $Desired = "$IcoPath,0"
                if ($Sc.IconLocation -ne $Desired) {
                    $Sc.IconLocation = $Desired
                    $Sc.Save()
                    $ChangedLnk = $true
                }
            }
        } catch {}
    }
}
if ($ChangedLnk) {
    [AgyIconWin32]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)
}
`;
            fs.writeFileSync(psPath, psCode, 'utf8');
            execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', psPath, '-PngPath', pngPath, '-IcoPath', icoPath], {
                timeout: 15000,
                windowsHide: true,
            }, (err) => {
                if (err) {
                    log(`App icon Win32 update note: ${err.message}`);
                } else {
                    log(`Updated Antigravity app & shortcut icon for "${item.themeName || 'active'}"`);
                }
                appIconUpdateRunning = false;
                if (appIconUpdateQueued) flushWindowsAppIconQueue();
            });
            return;
        }
    } catch (err) {
        log(`App icon write error: ${err.message}`);
    }
    appIconUpdateRunning = false;
    if (appIconUpdateQueued) flushWindowsAppIconQueue();
}

function handleUpdateAppIcon(payloadStr) {
    try {
        const job = JSON.parse(payloadStr || '{}');
        const key = String(job.key || '');
        const pngDataUrl = String(job.pngDataUrl || '');
        if (!pngDataUrl.startsWith('data:image/png;base64,')) return;
        if (key && key === lastAppIconKey && fs.existsSync(path.join(USER_MEDIA_DIR, 'active_app_icon.ico'))) return;
        const b64 = pngDataUrl.slice('data:image/png;base64,'.length);
        const pngBuf = Buffer.from(b64, 'base64');
        if (!pngBuf || pngBuf.length < 32) return;
        if (key) lastAppIconKey = key;
        appIconUpdateQueued = { key, themeName: String(job.themeName || ''), pngBuf };
        flushWindowsAppIconQueue();
    } catch (err) {
        log(`App icon payload parse error: ${err.message}`);
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
const pluginSessions = new Map();

function buildPluginGlassExpr() {
    const cfg = readConfig();
    const isLight = Boolean(cfg && cfg.themeName && /light|paper|sakura|snow|ivory|day/i.test(String(cfg.themeName)));
    const accent = (cfg && cfg.customThemes && cfg.themeName && cfg.customThemes[cfg.themeName]?.primary) || '#ff6b35';
    const hairline = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.10)';
    const css = `
      html, body, #root, #app, main, header, .header, nav, .tabs, .app, .board, [class*="container"], [class*="shell"] {
        background: transparent !important;
        background-color: transparent !important;
      }
      /* Keep Swarm Board header + search toolbar pinned above the scroll container so feed text never overlaps behind transparent Glass */
      html:has(> body > #board),
      html:has(> body > #board) > body {
        height: 100% !important;
        overflow: hidden !important;
      }
      #board {
        display: flex !important;
        flex-direction: column !important;
        height: 100vh !important;
        overflow: hidden !important;
      }
      #board > header.header {
        position: relative !important;
        top: auto !important;
        flex-shrink: 0 !important;
        background: transparent !important;
        border-bottom: 1px solid ${hairline} !important;
      }
      #board > main.main {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-top: 12px !important;
      }
      #board > main.main:has(> #tab-feed.active) {
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      #board #tab-feed.active {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      #board #tab-feed > .toolbar {
        position: relative !important;
        top: auto !important;
        flex-shrink: 0 !important;
        margin-top: 0 !important;
        padding: 0 0 10px 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        clip-path: none !important;
        border-bottom: 1px solid ${hairline} !important;
      }
      #board #tab-feed > #feed {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-top: 10px !important;
      }
      :is(.card, .panel, .surface, [class*="card"], [class*="panel"], [class*="box"]):not(button):not(.header-row) {
        background: ${isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.04)'} !important;
        border-color: ${hairline} !important;
        backdrop-filter: none !important;
      }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent !important; }
      ::-webkit-scrollbar-thumb { background: ${accent}66 !important; border-radius: 9999px; }
    `;
    return `(() => {
      try {
        let s = document.getElementById('agy-plugin-glass-style');
        if (!s) {
          s = document.createElement('style');
          s.id = 'agy-plugin-glass-style';
          (document.head || document.documentElement).appendChild(s);
        }
        s.textContent = ${JSON.stringify(css)};
      } catch (_) {}
    })();`;
}

function createPluginSession(target) {
    let ws;
    try {
        ws = new WebSocket(target.webSocketDebuggerUrl);
    } catch (_) {
        return;
    }
    const pSession = { id: target.id, ws, evalGlass: null };
    pluginSessions.set(target.id, pSession);

    let nextId = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
        if (ws.readyState !== 1) return resolve(null);
        const id = nextId++;
        const onMsg = (ev) => {
            try {
                const d = JSON.parse(String(ev.data));
                if (d.id === id) { ws.removeEventListener('message', onMsg); resolve(d.result); }
            } catch (_) {}
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
        setTimeout(() => { ws.removeEventListener('message', onMsg); resolve(null); }, 4000);
    });

    pSession.evalGlass = async () => {
        const expr = buildPluginGlassExpr();
        await send('Runtime.evaluate', { expression: expr, awaitPromise: false });
    };

    ws.addEventListener('message', async (ev) => {
        try {
            const msg = JSON.parse(String(ev.data));
            if (msg.method === 'Page.loadEventFired' || msg.method === 'Page.domContentEventFired') {
                await pSession.evalGlass();
            }
        } catch (_) {}
    });

    ws.addEventListener('open', async () => {
        await send('Page.enable');
        await send('Runtime.enable');
        const expr = buildPluginGlassExpr();
        await send('Page.addScriptToEvaluateOnNewDocument', { source: expr });
        await send('Runtime.evaluate', { expression: expr, awaitPromise: false });
    });

    const cleanup = () => {
        if (pluginSessions.get(target.id) === pSession) pluginSessions.delete(target.id);
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
}
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

    session.send = send;
    session.evalExpr = async (expression) => {
        try {
            await send('Runtime.evaluate', { expression, awaitPromise: false });
        } catch (_) {}
    };
    session.evalValue = async (expression) => {
        try {
            const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
            return res && res.result ? res.result.value : undefined;
        } catch (_) {
            return undefined;
        }
    };

    async function ensureBindings() {
        const names = ['agySaveThemeConfig', 'agyDesignThemeV2', 'agyYtSearch', 'agyYtResolve', 'agyUpdateAppIcon', 'agyGeneratePetVoice'];
        for (const name of names) {
            try { await send('Runtime.removeBinding', { name }); } catch (_) {}
            try { await send('Runtime.addBinding', { name }); } catch (_) {}
        }
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
                for (const ps of pluginSessions.values()) {
                    ps.evalGlass && ps.evalGlass();
                }
                ensureDesktopOverlay();
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
            if (job && job.id && (job.image || job.existingWallpaperPath)) {
                const reply = (obj) => {
                    const expr = `window.__AGY_DESIGN_RESULT_V2__ && window.__AGY_DESIGN_RESULT_V2__(${JSON.stringify(job.id)}, ${JSON.stringify(JSON.stringify(obj))})`;
                    send('Runtime.evaluate', { expression: expr }).catch(() => {});
                };
                designTheme(job.image || '', {
                    log,
                    width: job.width,
                    height: job.height,
                    userPrompt: typeof job.userPrompt === 'string' ? job.userPrompt : '',
                    existingThemeName: typeof job.existingThemeName === 'string' ? job.existingThemeName : '',
                    existingTheme: job.existingTheme && typeof job.existingTheme === 'object' ? job.existingTheme : null,
                    existingWallpaperPath: typeof job.existingWallpaperPath === 'string' ? job.existingWallpaperPath : '',
                })
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

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agyUpdateAppIcon') {
            handleUpdateAppIcon(msg.params.payload || '{}');
            return;
        }

        if (msg.method === 'Runtime.bindingCalled' && msg.params && msg.params.name === 'agyGeneratePetVoice') {
            let job = null;
            try { job = JSON.parse(msg.params.payload || '{}'); } catch (_) {}
            if (job && job.id) {
                const reply = (obj) => {
                    const expr = `window.__AGY_VOICE_GEN_CB__ && window.__AGY_VOICE_GEN_CB__(${JSON.stringify(job.id)}, ${JSON.stringify(JSON.stringify(obj))})`;
                    send('Runtime.evaluate', { expression: expr }).catch(() => {});
                };
                generatePetVoiceClips(job)
                    .then((res) => reply({ ok: true, ...res }))
                    .catch((err) => reply({ ok: false, error: err.message || String(err) }));
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

    const pluginFrames = targets.filter((t) =>
        t && t.type === 'iframe' && t.webSocketDebuggerUrl && String(t.url || '').startsWith('plugin://')
    );
    const livePluginIds = new Set(pluginFrames.map((f) => f.id));
    for (const [id, ps] of pluginSessions.entries()) {
        if (!livePluginIds.has(id)) {
            try { ps.ws.close(); } catch (_) {}
            pluginSessions.delete(id);
        }
    }
    for (const pf of pluginFrames) {
        if (!pluginSessions.has(pf.id)) {
            createPluginSession(pf);
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
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
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

const OVERLAY_SCRIPT_PATH = path.join(__dirname, 'pet_overlay.py');
const OVERLAY_PID_FILE = path.join(ROOT_DIR, 'overlay.pid');
let overlayProc = null;
let overlayLastProbeAt = 0;
let overlayLastProbeData = { agentState: 'idle', latestReply: '', replySeq: '', pageTitle: 'Antigravity' };
let overlaySpawnBlockedUntil = 0;

function getPrimaryOverlaySession() {
    let fallback = null;
    for (const s of sessions.values()) {
        if (!s || !s.ws || s.ws.readyState !== 1) continue;
        const u = String((s.target && s.target.url) || '');
        if (u.startsWith('data:') || u.startsWith('devtools://')) continue;
        if (!fallback) fallback = s;
        if (u.includes('127.0.0.1') || u.includes('localhost')) return s;
    }
    return fallback;
}

function readThemesCatalog() {
    let builtinThemes = {};
    try {
        if (fs.existsSync(THEMES_JSON_PATH)) {
            const parsed = JSON.parse(fs.readFileSync(THEMES_JSON_PATH, 'utf8'));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) builtinThemes = parsed;
        }
    } catch (_) {}
    const cfg = readConfig();
    const customThemes = (cfg.customThemes && typeof cfg.customThemes === 'object' && !Array.isArray(cfg.customThemes))
        ? cfg.customThemes
        : {};
    return { cfg, themes: { ...builtinThemes, ...customThemes } };
}

async function probeActiveAntigravityState() {
    const now = Date.now();
    if (now - overlayLastProbeAt < 450) return overlayLastProbeData;
    const sess = getPrimaryOverlaySession();
    if (!sess || typeof sess.evalValue !== 'function') {
        overlayLastProbeAt = now;
        return overlayLastProbeData;
    }
    overlayLastProbeAt = now;
    try {
        const probe = await sess.evalValue(`(() => {
            const runEl = document.querySelector('[data-testid="status-task-running"], [data-testid="input-cancel-button"], [data-testid="status-loading-spinner"], button[aria-label="Stop execution"], button[aria-label="Cancel Task"]');
            const waitEl = document.querySelector('[data-testid="approve-button"], [data-testid="confirm-button"], button[aria-label*="Approve" i], button[aria-label*="Allow" i]');
            const errEl = document.querySelector('[data-testid="error-message"], [data-status="error"], .text-destructive[role="alert"]');
            const resps = Array.from(document.querySelectorAll('[data-testid="agent-response"]'));
            let rawText = '';
            for (let i = resps.length - 1; i >= 0; i--) {
                const el = resps[i];
                const blocks = Array.from(el.querySelectorAll('div:not([role="status"]) > p, p')).filter(p => !p.closest('[role="status"], button'));
                const txt = (blocks.length ? blocks.map(n => String(n.innerText || '').trim()).filter(Boolean).join(' ') : String(el.innerText || '').trim()).replace(/\\s+/g, ' ').trim();
                if (txt) { rawText = txt; break; }
            }
            const latestReply = rawText.length > 260 ? (rawText.slice(0, 257) + '…') : rawText;
            const state = runEl ? 'running' : (waitEl ? 'waiting' : (errEl ? 'failed' : (resps.length ? 'ready' : 'idle')));
            return {
                agentState: state,
                latestReply,
                replySeq: resps.length ? (resps.length + ':' + rawText.length + ':' + rawText.slice(-24)) : '',
                pageTitle: document.title || 'Antigravity'
            };
        })()`);
        if (probe && typeof probe === 'object') {
            overlayLastProbeData = probe;
        }
    } catch (_) {}
    return overlayLastProbeData;
}

async function getOverlayStateSnapshot() {
    const { cfg, themes } = readThemesCatalog();
    const themeName = cfg.themeName && themes[cfg.themeName]
        ? cfg.themeName
        : (themes['WLOP Cosmic'] ? 'WLOP Cosmic' : (Object.keys(themes)[0] || 'WLOP Cosmic'));
    const th = themes[themeName] || {};
    const petName = (th.petDirective && th.petDirective.petName)
        || (th.petMeta && th.petMeta.petName)
        || (th.workIdentity && th.workIdentity.characterName)
        || themeName;
    const petSpriteUrl = th.petSpriteUrl || 'assets/pets/pet_wlop.webp';
    const overrides = (cfg.petVoiceOverrides && typeof cfg.petVoiceOverrides === 'object') ? cfg.petVoiceOverrides : {};
    const ovEntry = overrides[themeName];
    const petVoices = (ovEntry && Array.isArray(ovEntry.clips) && ovEntry.clips.length)
        ? ovEntry.clips
        : (Array.isArray(th.petVoices) && th.petVoices.length ? th.petVoices : (Array.isArray(cfg.taskVoices) ? cfg.taskVoices : []));
    const live = await probeActiveAntigravityState();
    return {
        ok: true,
        themeName,
        petName,
        petSpriteUrl,
        petVoices,
        desktopOverlayMode: cfg.desktopOverlayMode || 'auto',
        desktopOverlayPos: cfg.desktopOverlayPos || null,
        petEnabled: cfg.petEnabled !== false && cfg.themeMode !== 'static',
        syncPetVoice: cfg.syncPetVoice !== false,
        taskVoiceEnabled: cfg.taskVoiceEnabled !== false,
        taskVoiceVol: Number.isFinite(Number(cfg.taskVoiceVol)) ? Number(cfg.taskVoiceVol) : 85,
        colors: {
            primary: th.primary || '#38bdf8',
            secondary: th.secondary || '#c084fc',
            bg: th.bg || '',
            borderColor: th.borderColor || '',
        },
        ...live,
    };
}

async function submitChatToAntigravity(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return { ok: false, error: 'Empty message' };
    const sess = getPrimaryOverlaySession();
    if (!sess) return { ok: false, error: 'No active Antigravity window' };

    const focusRes = await sess.evalValue(`(() => {
        const comps = Array.from(document.querySelectorAll('.surface-composer'));
        let targetComp = comps.find(c => {
            const r = c.getBoundingClientRect();
            return r.width > 40 && r.height > 20;
        }) || comps[0];
        if (!targetComp) return { ok: false, error: 'Composer not found' };
        const ed = targetComp.querySelector('[data-lexical-editor="true"], [contenteditable="true"], textarea');
        if (!ed) return { ok: false, error: 'Editor input not found' };
        ed.click();
        ed.focus();
        let inserted = false;
        try {
            if (ed.tagName === 'TEXTAREA') {
                ed.value = (ed.value ? ed.value + ' ' : '') + ${JSON.stringify(cleanText)};
                ed.dispatchEvent(new Event('input', { bubbles: true }));
                inserted = true;
            } else {
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(ed);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                inserted = document.execCommand('insertText', false, ${JSON.stringify(cleanText)});
            }
        } catch (_) {}
        return { ok: true, inserted, textNow: String(ed.innerText || ed.value || '').trim().length };
    })()`);

    if (!focusRes || !focusRes.ok) {
        return { ok: false, error: (focusRes && focusRes.error) || 'Failed focusing composer' };
    }
    if (!focusRes.inserted) {
        await sess.send('Input.insertText', { text: cleanText });
    }
    await new Promise((r) => setTimeout(r, 110));

    const clickedSend = await sess.evalValue(`(() => {
        const comps = Array.from(document.querySelectorAll('.surface-composer'));
        const comp = comps.find(c => c.getBoundingClientRect().width > 40) || comps[0];
        if (!comp) return false;
        const explicitBtn = comp.querySelector('button[data-testid="send-button"]:not([disabled]), button[aria-label="Send message"]:not([disabled])');
        if (explicitBtn) {
            explicitBtn.click();
            return true;
        }
        const btns = Array.from(comp.querySelectorAll('button')).filter(b => !b.disabled);
        const sendBtn = btns.find(b => {
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const testid = (b.getAttribute('data-testid') || '').toLowerCase();
            const typ = (b.getAttribute('type') || '').toLowerCase();
            if (testid.includes('cancel') || aria.includes('cancel') || aria.includes('voice') || aria.includes('context') || testid.includes('model') || testid.includes('permission')) return false;
            return aria.includes('send') || testid.includes('send') || testid.includes('submit') || typ === 'submit';
        });
        if (sendBtn) {
            sendBtn.click();
            return true;
        }
        return false;
    })()`);

    if (!clickedSend) {
        await sess.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
        await sess.send('Input.dispatchKeyEvent', { type: 'char', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r' });
        await sess.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
    }
    return { ok: true, method: clickedSend ? 'button' : 'enter', pageTitle: (sess.target && sess.target.title) || 'Antigravity' };
}

function restoreAntigravityWindow() {
    if (process.platform !== 'win32') return;
    const ps = `
Add-Type @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class AgyFocusWin {
    public delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    public static void Focus() {
        var pids = new System.Collections.Generic.HashSet<uint>();
        foreach (var p in Process.GetProcessesByName("Antigravity")) pids.Add((uint)p.Id);
        EnumWindows((h, l) => {
            if (!IsWindowVisible(h)) return true;
            uint pid; GetWindowThreadProcessId(h, out pid);
            if (pids.Contains(pid)) { ShowWindow(h, 9); SetForegroundWindow(h); return false; }
            return true;
        }, IntPtr.Zero);
    }
}
"@
[AgyFocusWin]::Focus()
`;
    execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { windowsHide: true }, () => {});
}

function stopDesktopOverlay() {
    if (overlayProc && !overlayProc.killed) {
        try { overlayProc.kill('SIGTERM'); } catch (_) {}
    }
    overlayProc = null;
    if (fs.existsSync(OVERLAY_PID_FILE)) {
        try {
            const pid = parseInt(fs.readFileSync(OVERLAY_PID_FILE, 'utf8').trim(), 10);
            if (pid && isPidAlive(pid)) {
                try { process.kill(pid, 'SIGTERM'); } catch (_) {}
            }
            fs.unlinkSync(OVERLAY_PID_FILE);
        } catch (_) {}
    }
}

function ensureDesktopOverlay() {
    if (process.platform !== 'win32') return;
    if (!fs.existsSync(OVERLAY_SCRIPT_PATH)) return;
    const cfg = readConfig();
    const shouldRun = (cfg.desktopOverlayMode || 'auto') !== 'off' && cfg.petEnabled !== false && cfg.themeMode !== 'static';
    if (!shouldRun) {
        stopDesktopOverlay();
        return;
    }
    if (overlayProc && !overlayProc.killed && overlayProc.exitCode === null) return;
    if (fs.existsSync(OVERLAY_PID_FILE)) {
        try {
            const pid = parseInt(fs.readFileSync(OVERLAY_PID_FILE, 'utf8').trim(), 10);
            if (pid && isPidAlive(pid)) return;
        } catch (_) {}
    }
    if (Date.now() < overlaySpawnBlockedUntil) return;

    const pyExe = process.env.AGY_PYTHON || 'py';
    try {
        const proc = spawn(pyExe, [OVERLAY_SCRIPT_PATH, '--root', ROOT_DIR, '--media-port', String(MEDIA_PORT)], {
            cwd: ROOT_DIR,
            windowsHide: true,
            stdio: 'ignore',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });
        overlayProc = proc;
        proc.on('exit', (code) => {
            if (overlayProc === proc) overlayProc = null;
            if (code && code !== 0) {
                log(`Desktop Pet Overlay exited with code ${code}`);
                overlaySpawnBlockedUntil = Date.now() + 8000;
            }
        });
        proc.on('error', (err) => {
            log(`Desktop Pet Overlay spawn error: ${err.message}`);
            overlaySpawnBlockedUntil = Date.now() + 15000;
        });
    } catch (err) {
        log(`Desktop Pet Overlay launch failed: ${err.message}`);
        overlaySpawnBlockedUntil = Date.now() + 15000;
    }
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

    if (req.method === 'GET' && pathname === '/api/overlay/state') {
        const snap = await getOverlayStateSnapshot();
        sendJson(res, 200, snap);
        return;
    }

    if (req.method === 'POST' && pathname === '/api/overlay/chat') {
        try {
            const raw = await readRequestBody(req, 256 * 1024);
            const parsed = JSON.parse(raw.toString('utf8') || '{}');
            const out = await submitChatToAntigravity(parsed.text || '');
            sendJson(res, out.ok ? 200 : 400, out);
        } catch (err) {
            sendJson(res, 500, { ok: false, error: err.message });
        }
        return;
    }

    if (req.method === 'POST' && pathname === '/api/overlay/focus-app') {
        restoreAntigravityWindow();
        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/overlay/set-config') {
        try {
            const raw = await readRequestBody(req, 64 * 1024);
            const parsed = JSON.parse(raw.toString('utf8') || '{}');
            const allowed = {};
            if (parsed.desktopOverlayMode === 'auto' || parsed.desktopOverlayMode === 'always' || parsed.desktopOverlayMode === 'off') {
                allowed.desktopOverlayMode = parsed.desktopOverlayMode;
            }
            if (parsed.desktopOverlayPos && typeof parsed.desktopOverlayPos === 'object') {
                allowed.desktopOverlayPos = parsed.desktopOverlayPos;
            }
            if (typeof parsed.petEnabled === 'boolean') {
                allowed.petEnabled = parsed.petEnabled;
            }
            if (Object.keys(allowed).length > 0) {
                saveConfig(allowed);
                ensureDesktopOverlay();
                const syncExpr = `window.__AGY_SYNC_CONFIG_FROM_DAEMON__ && window.__AGY_SYNC_CONFIG_FROM_DAEMON__(${JSON.stringify(allowed)});`;
                for (const s of sessions.values()) {
                    s.evalExpr && s.evalExpr(syncExpr);
                }
            }
            sendJson(res, 200, { ok: true, updated: allowed });
        } catch (err) {
            sendJson(res, 400, { ok: false, error: err.message });
        }
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
    stopDesktopOverlay();
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
process.on('exit', () => {
    stopDesktopOverlay();
    removePidLock();
});

log(`Theme daemon started (PID ${process.pid}, platform=${process.platform}, portFile=${resolvePortFile()}).`);
startMediaServer();
ensureDesktopOverlay();
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
