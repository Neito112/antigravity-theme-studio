'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILTIN_VOICE_DIR = path.join(ROOT_DIR, 'themes', 'assets', 'voice', 'pets');
const USER_VOICE_DIR = path.join(ROOT_DIR, 'themes', 'user_media', 'voices');

const VOICE_STYLE_PRESETS = {
    'auto': { label: 'Tự động theo Pet', edgeVoice: 'en-US-AnaNeural', pitch: '+10Hz', rate: '+4%' },
    'anime-girl': { label: 'Anime Kawaii (Nữ cao sáng)', edgeVoice: 'en-US-AnaNeural', pitch: '+22Hz', rate: '+10%' },
    'noble-lady': { label: 'Quý tộc Fontaine / Dịu dàng', edgeVoice: 'en-US-AvaNeural', pitch: '+8Hz', rate: '+2%' },
    'calm-lady': { label: 'Thanh tao Sâu lắng (Concerto)', edgeVoice: 'en-US-EmmaNeural', pitch: '-4Hz', rate: '-5%' },
    'trickster': { label: 'Tinh quái / Ranh mãnh (Gengar)', edgeVoice: 'en-US-GuyNeural', pitch: '+24Hz', rate: '+14%' },
    'kaiju-deep': { label: 'Trầm hùng / Kaiju', edgeVoice: 'en-US-GuyNeural', pitch: '-30Hz', rate: '-6%' },
    'calm-guardian': { label: 'Hộ vệ Trầm ấm (Golem)', edgeVoice: 'en-US-AndrewNeural', pitch: '-26Hz', rate: '-9%' },
    'cyber-bot': { label: 'Cyber Telemetry Bot', edgeVoice: 'en-US-SteffanNeural', pitch: '-4Hz', rate: '+6%' },
    'warm-scholar': { label: 'Học giả Ấm áp', edgeVoice: 'en-US-BrianNeural', pitch: '-8Hz', rate: '-4%' },
    'vi-female': { label: 'Tiếng Việt (Nữ - Hoài My)', edgeVoice: 'vi-VN-HoaiMyNeural', pitch: '+4Hz', rate: '+4%' },
    'vi-male': { label: 'Tiếng Việt (Nam - Nam Minh)', edgeVoice: 'vi-VN-NamMinhNeural', pitch: '+0Hz', rate: '+2%' },
    'ja-kawaii': { label: 'Tiếng Nhật Kawaii (Nanami)', edgeVoice: 'ja-JP-NanamiNeural', pitch: '+14Hz', rate: '+6%' }
};

const PET_VOICE_PROFILES = {
    'furina': {
        style: 'noble-lady',
        edgeVoice: 'en-US-AvaNeural',
        pitch: '+12Hz',
        rate: '+6%',
        lines: [
            { label: 'Furina · Encore', text: 'Aha! Another splendid performance complete. Applause, please!' },
            { label: 'Furina · Curtain Call', text: 'Ta-da! Your code curtain call is ready, my dear director.' },
            { label: 'Furina · Hydro', text: 'All tasks concluded cleanly. Ready for our next act!' }
        ]
    },
    'gemini-chan': {
        style: 'anime-girl',
        edgeVoice: 'en-US-AnaNeural',
        pitch: '+22Hz',
        rate: '+10%',
        lines: [
            { label: 'Yuki · Sparkle Clear', text: 'Yuki finished checking every sparkle! Everything is ready for you!' },
            { label: 'Yuki · Starlight', text: 'Starlight mission clear! Want Yuki to watch the night sky with you?' },
            { label: 'Yuki · Cheer', text: 'Yay, task complete! Good work today!' }
        ]
    },
    'wlop': {
        style: 'calm-lady',
        edgeVoice: 'en-US-EmmaNeural',
        pitch: '-4Hz',
        rate: '-5%',
        lines: [
            { label: 'Seraph · Concerto', text: 'The cosmic concerto is complete. Every note rests in place.' },
            { label: 'Seraph · Starlight', text: 'Your work shines beneath the city lights of Earth.' },
            { label: 'Seraph · Harmony', text: 'Harmony restored across the workspace. Ready when you are.' }
        ]
    },
    'celestial': {
        style: 'calm-lady',
        edgeVoice: 'en-GB-SoniaNeural',
        pitch: '-6Hz',
        rate: '-4%',
        lines: [
            { label: 'Solara · Orbit Lock', text: 'Orbital calculations aligned. The eclipse sequence has concluded.' },
            { label: 'Solara · Telemetry', text: 'All celestial trajectories verified and nominal.' },
            { label: 'Solara · Quiet', text: 'Silence returns to the observatory. Mission complete.' }
        ]
    },
    'grotto': {
        style: 'calm-guardian',
        edgeVoice: 'en-US-AndrewNeural',
        pitch: '-26Hz',
        rate: '-9%',
        lines: [
            { label: 'Lumia · Guardian', text: 'The stone guardian has watched closely. Your path ahead is clear.' },
            { label: 'Lumia · Bloom', text: 'Every crystal blossom glows in peace. Task completed safely.' },
            { label: 'Lumia · Forest', text: 'Steady as ancient stone. Well done.' }
        ]
    },
    'miku': {
        style: 'anime-girl',
        edgeVoice: 'en-US-AnaNeural',
        pitch: '+26Hz',
        rate: '+11%',
        lines: [
            { label: 'Miku · Stage Clear', text: 'Stage clear! Miku finished tuning your workspace melody!' },
            { label: 'Miku · Seaside', text: 'Sunshine and sparkling rhythm! All checks passed!' },
            { label: 'Miku · Encore', text: 'Encore ready! Pick our next song whenever you want!' }
        ]
    },
    'obsidian': {
        style: 'cyber-bot',
        edgeVoice: 'en-GB-RyanNeural',
        pitch: '-12Hz',
        rate: '+2%',
        lines: [
            { label: 'Onyx · Stealth', text: 'Shadow execution complete. Zero anomalies detected.' },
            { label: 'Onyx · Clear', text: 'Obsidian perimeter clear. Standing by.' },
            { label: 'Onyx · Standby', text: 'Clean finish. Next objective ready.' }
        ]
    },
    'codex': {
        style: 'cyber-bot',
        edgeVoice: 'en-US-SteffanNeural',
        pitch: '-4Hz',
        rate: '+6%',
        lines: [
            { label: 'Byte · Telemetry Green', text: 'Telemetry green. Build verification and pipeline completed.' },
            { label: 'Byte · Nominal', text: 'Byte reports all systems nominal. Ready for next command.' },
            { label: 'Byte · Zero Errors', text: 'Execution cycle finished cleanly.' }
        ]
    },
    'claude': {
        style: 'warm-scholar',
        edgeVoice: 'en-US-BrianNeural',
        pitch: '-8Hz',
        rate: '-4%',
        lines: [
            { label: 'Solis · Warm Wrap', text: 'Everything is thoughtfully wrapped up. Take a warm sip and review.' },
            { label: 'Solis · Notes Ready', text: 'Solis checked the final notes. Your draft is complete.' },
            { label: 'Solis · Continue', text: 'Nicely done. Whenever you are ready, let us continue.' }
        ]
    },
    'kaiju-crimson': {
        style: 'kaiju-deep',
        edgeVoice: 'en-US-GuyNeural',
        pitch: '-32Hz',
        rate: '-6%',
        lines: [
            { label: 'Kaiju · Roar Clear', text: 'Roar! Kaiju crushed that task cleanly! Bring on the next bug!' },
            { label: 'Kaiju · Reactor Core', text: 'Crimson reactor stable! Mission conquered!' },
            { label: 'Kaiju · Victory', text: 'Kaiju reporting victory across the city skyline!' }
        ]
    },
    'pixel-kaiju': {
        style: 'kaiju-deep',
        edgeVoice: 'en-US-ChristopherNeural',
        pitch: '-18Hz',
        rate: '+4%',
        lines: [
            { label: 'Rexy · High Score', text: 'Stage clear! Rexy unlocked a new high score on your build!' },
            { label: 'Rexy · Atomic Breath', text: 'Teal atomic breath charged! Level complete!' },
            { label: 'Rexy · Arcade', text: 'Arcade mission clear! Ready for the next quest!' }
        ]
    },
    'phantom-voltage': {
        style: 'trickster',
        edgeVoice: 'en-US-GuyNeural',
        pitch: '+24Hz',
        rate: '+14%',
        lines: [
            { label: 'Volt · Gengar Zap', text: 'Gengaaa! Volt zapped every bug cleanly! Next prank, please!' },
            { label: 'Volt · Voltage Max', text: 'Hehehe! Phantom voltage at one hundred percent! Task cleared!' },
            { label: 'Volt · Blink', text: 'Zap-zap! Everything is done before anyone even blinked!' }
        ]
    }
};

function findPython() {
    if (process.env.AGY_PYTHON && fs.existsSync(process.env.AGY_PYTHON)) return process.env.AGY_PYTHON;
    const cands = process.platform === 'win32'
        ? ['py', 'python', 'python3']
        : ['python3', 'python'];
    return cands[0];
}

function detectTextLanguage(text) {
    const s = String(text || '');
    if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(s)) return 'ja';
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s)) return 'vi';
    return 'en';
}

function resolveProfileForPet({ petId, petDirective, voiceStyle, pitchHz, ratePct }) {
    const cleanId = String(petId || '').trim().toLowerCase();
    const baseProf = PET_VOICE_PROFILES[cleanId] || null;
    const styleKey = (voiceStyle && voiceStyle !== 'auto' && VOICE_STYLE_PRESETS[voiceStyle])
        ? voiceStyle
        : (baseProf ? baseProf.style : 'auto');
    const preset = VOICE_STYLE_PRESETS[styleKey] || VOICE_STYLE_PRESETS.auto;
    const edgeVoice = (voiceStyle && voiceStyle !== 'auto' && VOICE_STYLE_PRESETS[voiceStyle])
        ? preset.edgeVoice
        : ((baseProf && baseProf.edgeVoice) || preset.edgeVoice);

    const parseHz = (v, def) => {
        const n = Number(v);
        if (Number.isFinite(n)) return `${n >= 0 ? '+' : ''}${Math.round(Math.max(-45, Math.min(45, n)))}Hz`;
        return def;
    };
    const parsePct = (v, def) => {
        const n = Number(v);
        if (Number.isFinite(n)) return `${n >= 0 ? '+' : ''}${Math.round(Math.max(-30, Math.min(40, n)))}%`;
        return def;
    };

    const defaultPitch = (baseProf && styleKey === baseProf.style) ? baseProf.pitch : preset.pitch;
    const defaultRate = (baseProf && styleKey === baseProf.style) ? baseProf.rate : preset.rate;

    return {
        style: styleKey,
        edgeVoice,
        pitch: pitchHz !== undefined && pitchHz !== null && pitchHz !== '' ? parseHz(pitchHz, defaultPitch) : defaultPitch,
        rate: ratePct !== undefined && ratePct !== null && ratePct !== '' ? parsePct(ratePct, defaultRate) : defaultRate,
    };
}

function buildDefaultLinesForPet({ petId, petName, themeName, workIdentity, petDirective }) {
    const cleanId = String(petId || '').trim().toLowerCase();
    if (PET_VOICE_PROFILES[cleanId]) {
        return PET_VOICE_PROFILES[cleanId].lines;
    }
    const nm = String(petName || (petDirective && petDirective.petName) || 'Companion').trim() || 'Companion';
    const world = String((workIdentity && (workIdentity.franchise || workIdentity.brandTitle)) || themeName || 'Workspace').trim();
    return [
        { label: `${nm} · Complete`, text: `${nm} finished your task in ${world}! Everything looks crisp.` },
        { label: `${nm} · Ready`, text: `All systems synced for ${nm}. Ready for your next command!` },
        { label: `${nm} · Cheer`, text: `Great job! ${nm} is cheering you on!` }
    ];
}

function sanitizeText(text) {
    return String(text || '')
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
        .trim();
}

function synthesizeBatchViaEdgeTts(jobs, timeoutMs = 35000) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(jobs) || jobs.length === 0) return resolve([]);
        const py = findPython();
        const pyScript = [
            'import asyncio, json, sys, os',
            'import edge_tts',
            'if hasattr(sys.stdin, "reconfigure"): sys.stdin.reconfigure(encoding="utf-8", errors="replace")',
            'if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8", errors="replace")',
            'payload = json.loads(sys.stdin.read())',
            'async def synth_one(item):',
            '    os.makedirs(os.path.dirname(item["outPath"]), exist_ok=True)',
            '    comm = edge_tts.Communicate(item["text"], item["voice"], pitch=item["pitch"], rate=item["rate"])',
            '    await comm.save(item["outPath"])',
            '    return os.path.exists(item["outPath"]) and os.path.getsize(item["outPath"]) > 256',
            'async def run_all():',
            '    res = await asyncio.gather(*(synth_one(it) for it in payload), return_exceptions=True)',
            '    out = []',
            '    for it, r in zip(payload, res):',
            '        out.append({"outPath": it["outPath"], "ok": (r is True), "err": ("" if r is True else str(r))})',
            '    print(json.dumps(out))',
            'asyncio.run(run_all())'
        ].join('\n');

        const safeJobs = jobs.map((j) => ({ ...j, text: sanitizeText(j.text) }));
        const child = spawn(py, ['-c', pyScript], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
        });
        let out = '', err = '';
        const timer = setTimeout(() => { try { child.kill(); } catch (_) {} reject(new Error('edge-tts timed out')); }, timeoutMs);
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { err += d; });
        child.on('error', (e) => { clearTimeout(timer); reject(e); });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) return reject(new Error(err.trim() || `edge-tts exited ${code}`));
            try {
                const parsed = JSON.parse(out.trim().split(/\r?\n/).pop() || '[]');
                resolve(parsed);
            } catch (e) {
                reject(e);
            }
        });
        child.stdin.write(JSON.stringify(safeJobs), 'utf8');
        child.stdin.end();
    });
}

async function generatePetVoiceClips(opts = {}) {
    const petId = String(opts.petId || 'companion').trim().toLowerCase();
    const petName = String(opts.petName || 'Companion').trim() || 'Companion';
    const themeName = String(opts.themeName || '').trim();
    const useBuiltinDir = opts.useBuiltinDir === true;
    const outDir = useBuiltinDir ? BUILTIN_VOICE_DIR : USER_VOICE_DIR;
    const urlPrefix = useBuiltinDir ? 'assets/voice/pets' : 'user_media/voices';
    fs.mkdirSync(outDir, { recursive: true });

    const prof = resolveProfileForPet({
        petId,
        petDirective: opts.petDirective,
        voiceStyle: opts.voiceStyle,
        pitchHz: opts.pitchHz,
        ratePct: opts.ratePct,
    });

    let rawLines = Array.isArray(opts.voiceLines)
        ? opts.voiceLines.map((s) => String(s || '').trim()).filter(Boolean)
        : (typeof opts.voiceLines === 'string'
            ? opts.voiceLines.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            : []);

    const items = rawLines.length > 0
        ? rawLines.slice(0, 6).map((txt, idx) => ({ label: `${petName} · Custom ${idx + 1}`, text: txt.slice(0, 240) }))
        : buildDefaultLinesForPet({
            petId,
            petName,
            themeName,
            workIdentity: opts.workIdentity,
            petDirective: opts.petDirective,
        });

    const slug = petId.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pet';
    const jobs = items.map((it, idx) => {
        const lang = detectTextLanguage(it.text);
        let voice = prof.edgeVoice;
        let pitch = prof.pitch;
        if (lang === 'vi' && !voice.startsWith('vi-VN-')) {
            voice = (prof.style === 'kaiju-deep' || prof.style === 'calm-guardian' || prof.style === 'cyber-bot' || prof.style === 'warm-scholar')
                ? 'vi-VN-NamMinhNeural'
                : 'vi-VN-HoaiMyNeural';
            pitch = prof.style === 'trickster' ? '+16Hz' : (prof.style === 'kaiju-deep' ? '-18Hz' : '+2Hz');
        } else if (lang === 'ja' && !voice.startsWith('ja-JP-')) {
            voice = (prof.style === 'kaiju-deep' || prof.style === 'calm-guardian')
                ? 'ja-JP-KeitaNeural'
                : 'ja-JP-NanamiNeural';
        }
        const hash = crypto.createHash('sha1').update(`${slug}|${voice}|${pitch}|${prof.rate}|${it.text}`).digest('hex').slice(0, 8);
        const filename = `pet_${slug}_${idx + 1}_${hash}.mp3`;
        return {
            label: it.label,
            text: it.text,
            voice,
            pitch,
            rate: prof.rate,
            filename,
            outPath: path.join(outDir, filename),
            url: `${urlPrefix}/${filename}`
        };
    });

    const missing = jobs.filter((j) => !fs.existsSync(j.outPath) || fs.statSync(j.outPath).size < 256);
    if (missing.length > 0) {
        const synthRes = await synthesizeBatchViaEdgeTts(missing, opts.timeoutMs || 35000);
        const failed = synthRes.filter((r) => !r.ok);
        if (failed.length === missing.length && missing.length > 0) {
            throw new Error(failed[0].err || 'edge-tts synthesis failed');
        }
    }

    const clips = jobs
        .filter((j) => fs.existsSync(j.outPath) && fs.statSync(j.outPath).size > 256)
        .map((j) => ({
            url: j.url,
            name: j.label,
            text: j.text,
            petId,
            voice: j.voice,
            style: prof.style
        }));

    return {
        clips,
        style: prof.style,
        voice: prof.edgeVoice,
        pitch: prof.pitch,
        rate: prof.rate
    };
}

module.exports = {
    VOICE_STYLE_PRESETS,
    PET_VOICE_PROFILES,
    resolveProfileForPet,
    buildDefaultLinesForPet,
    generatePetVoiceClips
};
