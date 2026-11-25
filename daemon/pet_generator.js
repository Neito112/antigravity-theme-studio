'use strict';

/**
 * Generates an 8x11 (1536x2288, 192x208 cell) transparent WebP companion pet
 * spritesheet matching the Neito112/desktop-agent_pet v2 contract.
 * Uses Antigravity CLI (`agy -p` + `image-generator` subagent) + Python Pillow
 * chroma-key removal, edge spill suppression, and 8x11 atlas validation.
 * Cleanly falls back to `assets/pets/rocky.webp` on any failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const USER_MEDIA_DIR = path.join(ROOT_DIR, 'themes', 'user_media');
const FALLBACK_SPRITE_URL = 'assets/pets/rocky.webp';

const ATLAS_COLS = 8;
const ATLAS_ROWS = 11;
const CELL_W = 192;
const CELL_H = 208;
const ATLAS_W = ATLAS_COLS * CELL_W; // 1536
const ATLAS_H = ATLAS_ROWS * CELL_H; // 2288

function slugifyPetName(name) {
    const base = String(name || 'companion')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
    return base || 'companion';
}

function findPython() {
    for (const cmd of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
        const res = spawnSync(cmd, ['-c', 'import PIL; print(1)'], { windowsHide: true, encoding: 'utf8' });
        if (res.status === 0 && String(res.stdout).trim() === '1') return cmd;
    }
    return null;
}

function findAgy() {
    if (process.env.AGY_BIN && fs.existsSync(process.env.AGY_BIN)) return process.env.AGY_BIN;
    const candidates = [];
    if (process.platform === 'win32') {
        const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        candidates.push(path.join(local, 'agy', 'bin', 'agy.exe'));
    } else {
        candidates.push(path.join(os.homedir(), '.local', 'bin', 'agy'), '/usr/local/bin/agy', '/opt/homebrew/bin/agy');
    }
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return 'agy';
}

function buildPetSpritePrompt(petDirective, rawSheetPath) {
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};
    const name = d.petName || 'Companion';
    const concept = d.personifiedConcept || 'Cute chibi pixel mascot';
    const prop = d.prop ? `holding or wearing a consistent ${d.prop}` : 'with a consistent small signature accessory';
    const style = d.style || 'pixel';
    const palette = Array.isArray(d.palette) && d.palette.length ? d.palette.join(', ') : '#7dd3fc, #f472b6, #1e1b4b';
    const action = d.signatureAction || 'cheerful wave';
    const customPrompt = d.spritePrompt ? `\nCharacter & pose specification: ${d.spritePrompt}` : '';

    return [
        `You are a pixel/chibi game sprite artist. Call \`invoke_subagent\` with \`TypeName: "image-generator"\` and \`Role: "2D Sprite Sheet Artist"\` to generate a single 8-column by 11-row sprite sheet PNG saved to "${rawSheetPath}".`,
        'Do not run shell commands (`run_command`), do not edit workspace source files.',
        '',
        'STRICT SPRITE SHEET LAYOUT (8 columns x 11 rows, aspect ratio 1536x2288 / 3:4.46, uniform grid, NO gridlines, NO labels, NO text):',
        `- Subject: "${name}" — ${concept}, ${prop}.`,
        `- Style: crisp ${style} mascot art, clean dark outline, readable silhouette at small sizes. Palette: ${palette}.${customPrompt}`,
        '- Background: SOLID FLAT CHROMA-KEY BRIGHT GREEN (#00FF00) with NO gradients, NO shadows on the floor, NO checkerboard, NO text, NO borders.',
        '- Every character frame must be centered inside its invisible grid cell with generous padding so adjacent cells never touch or clip.',
        '- Row 0 (cols 0-5): idle breathing/blinking loop (cols 6-7 empty green).',
        '- Row 1 (cols 0-7): running-right 8-frame cycle.',
        '- Row 2 (cols 0-7): running-left 8-frame cycle.',
        `- Row 3 (cols 0-3): waving / ${action} 4-frame loop (cols 4-7 empty green).`,
        '- Row 4 (cols 0-4): jumping 5-frame arc (cols 5-7 empty green).',
        '- Row 5 (cols 0-7): failed / deflated 8-frame reaction.',
        '- Row 6 (cols 0-5): waiting / expectant pose (cols 6-7 empty green).',
        '- Row 7 (cols 0-5): active working / typing / focused pose (cols 6-7 empty green).',
        '- Row 8 (cols 0-5): reviewing output pose (cols 6-7 empty green).',
        '- Row 9 (cols 0-7): 8 clockwise look poses (0° up through 157.5°).',
        '- Row 10 (cols 0-7): 8 clockwise look poses (180° down through 337.5°).',
        '',
        `Return ONLY JSON: {"generatedSheetPath": "${rawSheetPath}"}`
    ].join('\n');
}

/**
 * Uses Python Pillow to chroma-key #00FF00 (if opaque), suppress green edge spill,
 * normalize to exact 1536x2288 (8x11 of 192x208 cells), validate 8x11 grid occupancy,
 * and save as transparent WebP.
 */
function processAndValidateAtlas(inputPath, outWebpPath) {
    const py = findPython();
    if (!py) return { ok: false, reason: 'python-pil-missing' };

    const script = [
        'import json, math, sys',
        'from PIL import Image, ImageFilter',
        'in_path, out_path = sys.argv[1], sys.argv[2]',
        `COLS, ROWS, CELL_W, CELL_H = ${ATLAS_COLS}, ${ATLAS_ROWS}, ${CELL_W}, ${CELL_H}`,
        'TARGET_W, TARGET_H = COLS * CELL_W, ROWS * CELL_H',
        'im = Image.open(in_path).convert("RGBA")',
        'resample = getattr(getattr(Image, "Resampling", Image), "NEAREST", Image.NEAREST)',
        'if im.size != (TARGET_W, TARGET_H):',
        '    im = im.resize((TARGET_W, TARGET_H), resample)',
        'px = list(im.getdata())',
        'alpha_hist = im.getchannel("A").histogram()',
        'has_transparency = sum(alpha_hist[:250]) > (TARGET_W * TARGET_H * 0.15)',
        'if not has_transparency:',
        '    # Sample corner chroma key (expected #00FF00 or dominant border color)',
        '    corners = [px[0], px[TARGET_W - 1], px[(TARGET_H - 1) * TARGET_W], px[-1]]',
        '    kr = sum(c[0] for c in corners) / 4.0',
        '    kg = sum(c[1] for c in corners) / 4.0',
        '    kb = sum(c[2] for c in corners) / 4.0',
        '    cleaned = []',
        '    for r, g, b, a in px:',
        '        dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)',
        '        if dist < 52.0:',
        '            cleaned.append((0, 0, 0, 0))',
        '        elif dist < 86.0:',
        '            t = (dist - 52.0) / 34.0',
        '            na = int(round(a * t))',
        '            # Despill green channel on soft edge',
        '            ng = min(g, max(r, b) + 12) if kg > max(kr, kb) + 40 else g',
        '            cleaned.append((r, ng, b, na))',
        '        else:',
        '            cleaned.append((r, g, b, a))',
        '    im.putdata(cleaned)',
        'else:',
        '    # Zero RGB on fully transparent pixels',
        '    cleaned = [(0, 0, 0, 0) if a == 0 else (r, g, b, a) for (r, g, b, a) in px]',
        '    im.putdata(cleaned)',
        '',
        '# Edge-local green spill suppression along transparent boundary',
        'alpha = im.getchannel("A")',
        'visible = [v > 0 for v in alpha.getdata()]',
        'trans = Image.new("L", im.size)',
        'trans.putdata([0 if v else 255 for v in visible])',
        'expanded = trans.filter(ImageFilter.MaxFilter(5))',
        'rgba = list(im.getdata())',
        'despilled = []',
        'for (r, g, b, a), vis, near in zip(rgba, visible, expanded.getdata()):',
        '    if vis and near > 0 and g > max(r, b) + 18:',
        '        g = max(r, b) + 8',
        '    despilled.append((r, g, b, a))',
        'im.putdata(despilled)',
        '',
        '# Validate 8x11 grid: check transparency & key rows have visible sprite pixels',
        'used_rows = 0',
        'nonempty_cells = 0',
        'for row in range(ROWS):',
        '    row_used = False',
        '    for col in range(COLS):',
        '        cell = im.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))',
        '        ca = cell.getchannel("A")',
        '        nz = sum(ca.histogram()[16:])',
        '        if nz >= 40:',
        '            nonempty_cells += 1',
        '            row_used = True',
        '    if row_used:',
        '        used_rows += 1',
        '',
        'alpha_total = sum(im.getchannel("A").histogram()[16:])',
        'transparent_total = sum(im.getchannel("A").histogram()[:16])',
        'if used_rows < 8 or nonempty_cells < 32 or transparent_total < (TARGET_W * TARGET_H * 0.25) or alpha_total < 2000:',
        '    print(json.dumps({"ok": False, "reason": f"invalid-grid(rows={used_rows},cells={nonempty_cells},alpha={alpha_total})"}))',
        '    sys.exit(0)',
        '',
        'im.save(out_path, format="WEBP", lossless=True, quality=90)',
        'print(json.dumps({"ok": True, "width": TARGET_W, "height": TARGET_H, "rows": used_rows, "cells": nonempty_cells}))'
    ].join('\n');

    const res = spawnSync(py, ['-c', script, inputPath, outWebpPath], {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 45000
    });
    if (res.status !== 0) {
        return { ok: false, reason: String(res.stderr || res.stdout || 'pillow-error').trim().slice(0, 180) };
    }
    try {
        const parsed = JSON.parse(String(res.stdout || '').trim().split(/\r?\n/).pop() || '{}');
        return parsed && typeof parsed === 'object' ? parsed : { ok: false, reason: 'bad-validator-json' };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

function buildFallbackResult(petDirective, reason) {
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};
    return {
        petSpriteUrl: FALLBACK_SPRITE_URL,
        petId: 'rocky',
        petMeta: {
            petName: d.petName || 'Rocky',
            hasCharacter: Boolean(d.hasCharacter),
            sourceObject: d.sourceObject || '',
            personifiedConcept: d.personifiedConcept || 'Loyal desktop companion',
            style: d.style || 'pixel',
            palette: Array.isArray(d.palette) ? d.palette : [],
            idleMood: d.idleMood || 'calm-focus',
            prop: d.prop || '',
            signatureAction: d.signatureAction || 'wave',
            animationMood: d.animationMood || d.idleMood || 'calm-focus',
            spriteVersionNumber: 2,
            fallback: true,
            fallbackReason: reason || 'unavailable'
        }
    };
}

/**
 * Generates an 8x11 pet spritesheet for `petDirective` and saves it to
 * `themes/user_media/pet_<slug>.webp`. Never rejects — falls back cleanly to
 * `assets/pets/rocky.webp` if generation or validation fails.
 *
 * @param {object} petDirective
 * @param {{timeoutMs?: number, log?: Function, slugHint?: string}} opts
 * @returns {Promise<{petSpriteUrl: string, petId: string, petMeta: object}>}
 */
function generatePetSprite(petDirective, opts = {}) {
    const log = opts.log || (() => {});
    const timeoutMs = opts.timeoutMs || 180000;
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};

    if (process.env.AGY_DISABLE_PET_GEN === '1') {
        return Promise.resolve(buildFallbackResult(d, 'disabled-by-env'));
    }

    const py = findPython();
    if (!py) {
        log('Pet generator: Python Pillow unavailable, using fallback rocky.webp');
        return Promise.resolve(buildFallbackResult(d, 'python-pil-missing'));
    }

    const slug = slugifyPetName(opts.slugHint || d.petName || 'companion');
    const uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-pet-'));
    const rawSheetPath = path.join(jobDir, 'raw_sheet.png');
    const schemaFile = path.join(jobDir, 'schema.json');
    const cleanup = () => { try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (_) {} };

    fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { generatedSheetPath: { type: 'string' } },
        required: ['generatedSheetPath']
    }));

    const prompt = buildPetSpritePrompt(d, rawSheetPath);
    const args = ['-p', prompt, '--mode', 'accept-edits', '--output-format', 'json', '--json-schema', schemaFile, '--disable-slash-commands', '--add-dir', jobDir];
    if (process.env.AGY_THEME_MODEL) args.push('--model', process.env.AGY_THEME_MODEL);
    const bin = findAgy();

    return new Promise((resolve) => {
        let settled = false;
        const finishFallback = (reason) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            cleanup();
            log(`Pet generator fallback (${reason}) -> ${FALLBACK_SPRITE_URL}`);
            resolve(buildFallbackResult(d, reason));
        };

        let child;
        try {
            child = spawn(bin, args, { cwd: jobDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) {
            finishFallback(`spawn-error: ${err.message}`);
            return;
        }

        let out = '';
        child.stdout.on('data', (chunk) => { out += chunk; });
        const timer = setTimeout(() => {
            try { child.kill(); } catch (_) {}
            finishFallback('timeout');
        }, timeoutMs);

        child.on('error', (err) => finishFallback(`agy-error: ${err.message}`));
        child.on('close', (code) => {
            if (settled) return;
            clearTimeout(timer);
            try {
                let env;
                try { env = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop()); } catch (_) {}
                let candidatePath = rawSheetPath;
                if (env && env.structured_output && typeof env.structured_output.generatedSheetPath === 'string') {
                    const p = env.structured_output.generatedSheetPath.trim();
                    if (p && fs.existsSync(p)) candidatePath = p;
                }
                if (!fs.existsSync(candidatePath)) {
                    const files = fs.readdirSync(jobDir).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
                    if (files.length) candidatePath = path.join(jobDir, files[0]);
                }
                if (!fs.existsSync(candidatePath)) {
                    finishFallback(`no-sheet-generated(exit=${code})`);
                    return;
                }

                fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
                const outFilename = `pet_${uniqueSlug}.webp`;
                const outWebpPath = path.join(USER_MEDIA_DIR, outFilename);
                const val = processAndValidateAtlas(candidatePath, outWebpPath);
                if (!val.ok || !fs.existsSync(outWebpPath)) {
                    try { if (fs.existsSync(outWebpPath)) fs.unlinkSync(outWebpPath); } catch (_) {}
                    finishFallback(val.reason || 'atlas-validation-failed');
                    return;
                }

                settled = true;
                cleanup();
                log(`Pet spritesheet generated: ${outFilename} (${val.rows}x8 grid, ${val.cells} cells)`);
                resolve({
                    petSpriteUrl: `user_media/${outFilename}`,
                    petId: uniqueSlug,
                    petMeta: {
                        petName: d.petName || 'Companion',
                        hasCharacter: Boolean(d.hasCharacter),
                        sourceObject: d.sourceObject || '',
                        personifiedConcept: d.personifiedConcept || '',
                        style: d.style || 'pixel',
                        palette: Array.isArray(d.palette) ? d.palette : [],
                        idleMood: d.idleMood || 'calm-focus',
                        prop: d.prop || '',
                        signatureAction: d.signatureAction || 'wave',
                        animationMood: d.animationMood || d.idleMood || 'calm-focus',
                        spriteVersionNumber: 2,
                        fallback: false
                    }
                });
            } catch (err) {
                finishFallback(err.message || 'pet-gen-exception');
            }
        });
    });
}

module.exports = {
    generatePetSprite,
    processAndValidateAtlas,
    buildFallbackResult,
    slugifyPetName,
    FALLBACK_SPRITE_URL,
    ATLAS_COLS,
    ATLAS_ROWS,
    CELL_W,
    CELL_H,
    ATLAS_W,
    ATLAS_H
};
