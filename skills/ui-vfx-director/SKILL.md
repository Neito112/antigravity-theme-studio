---
name: ui-vfx-director
description: Transform any reference image into a complete Antigravity brand & UI/UX overhaul: deep IP/subject brand replacement (`brandTitle`, `brandLogoUrl`, `sigilSvgInner`), ultra-transparent breathable glass without thick neon/glow borders, smooth collapsible columns unlocking full workspace width, and an input-synchronized 8x11 companion pet with the native composer docked beneath its feet.
---

# UI VFX Director

Transforms any uploaded wallpaper or artwork into a cohesive **Brand Identity (`workIdentity` + `brandLogoUrl`)**, **Transparent Breathable UI Blueprint (`vfxSpec`)**, **Collapsible Full-Width Workspace**, and **Input-Synchronized Companion Pet (`petDirective` + `8×11` sprite)** while preserving zero Electron jank.

---

## Step 1: Deep IP, Subject & Context Analysis -> Complete Brand Replacement

Analyze the input image (`sourceImagePath`) across four dimensions before emitting any tokens:

1. **IP / World / Subject Identification**:
   - Identify the exact franchise, character, creature, or iconic central object (e.g., *Kaiju / Titan*, *Gengar / Phantom Voltage*, *Furina / Hydro Court*, *Rainy Espresso Cafe*).
   - Extract lighting mood, temperature, `primary` (dominant accent), `secondary` (highlight), `overlayRgb` (`"R, G, B"` darkened glass base), and `isLight: false` (default dark smoked glass for crisp contrast).
2. **Brand Title (`workIdentity.brandTitle`) — Total "Antigravity" Replacement**:
   - Output a punchy **1–3 word uppercase brand title** (e.g., `"KAIJU CRIMSON"`, `"PHANTOM VOLTAGE"`, `"HYDRO COURT"`, `"STARLIGHT NEXUS"`).
   - **Rule**: Replace EVERY visible `"Antigravity"` label across the IDE (titlebar `[data-testid="title-menu-bar-item"]`, `[data-testid="brand"]`, `document.title`, modals, and Boot HUD) with `brandTitle || franchise`. **NEVER** output `"ANTIGRAVITY"`.
3. **Custom Raster Brand Logo (`brandLogoUrl`)**:
   - `theme_designer.js` runs `generateBrandLogo(workIdentity, petDirective, { sourceImagePath })` in parallel with `generatePetSprite(...)`.
   - `pet_generator.js` passes `--add-dir` + `sourceImagePath` to `image-generator` to paint a `512×512` crisp icon/emblem on `#00FF00` chroma-key background, then uses Pillow to chroma-key, edge-despill, auto-trim visible alpha bounds, center-pad, and resize with LANCZOS to `256×256` transparent WebP saved at `themes/user_media/logo_<slug>.webp` (returned as `user_media/logo_<slug>.webp`, or `""` on fallback).
   - **Subject Fidelity**: The logo MUST directly depict the input image's subject (e.g., roaring Kaiju head + jagged dorsal fins; character's signature crest/hat/hairpin; stylized central object). Replaces `[data-testid="app-icon-new-conversation-button"]` and Boot Splash/Welcome icon.
4. **Vector Sigil Fallback & Boot Morph (`workIdentity.sigilSvgInner`)**:
   - Output **6 to 12 distinct, detailed vector primitives** (`<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<polyline>`, `<line>`, `<g>`) inside `viewBox="0 0 24 24"` (coordinates padded within `2..22`) depicting the unmistakable silhouette of the main subject/object for `#agy-stage-morph` stroke-trace and SVG logo fallback.
   - **STRICTLY FORBIDDEN**: Generic 4-point stars, plain circles, plain diamonds/triangles, or unrelated geometric filler; NO `<svg>` wrapper, `<script>`, `<image>`, `<foreignObject>`, `<style>`, or `on*` handlers.

### `workIdentity` Contract

```json
{
  "brandTitle": "KAIJU CRIMSON",
  "franchise": "KAIJU CRIMSON",
  "characterName": "Crimson Titan",
  "operator": "VANGUARD",
  "bootTagline": "REACTOR IGNITION // DORSAL SYNC 100%",
  "secondary": "#fbbf24",
  "sigilSvgInner": "<path d=\"M4 17L7 11L9 13L12 5L15 11L17 8L20 15L18 19H6Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\" fill=\"none\"/><path d=\"M8 15L11 10L13 13L15.5 9.5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M5 19H19\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\" fill=\"none\"/><circle cx=\"14.5\" cy=\"12.5\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M11 3L12 5L13 3\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M7 7L8.5 9.5\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\" fill=\"none\"/>"
}
```

---

## Step 2: Transparent, Breathable UI & Zero Neon/Thick-Border Clutter

Keep the fullscreen **4K 16:9 (`3840×2160` WebP)** wallpaper or video cleanly visible across `.agy-shell` by stripping away heavy borders and opaque boxes:

1. **Near-Transparent AI Responses (`[data-testid="agent-response"]`)**:
   - Set AI message background to near-transparent smoked tint: `rgba(${overlayRgb}, 0.14)`–`0.20` (`0.12–0.16` in light-tinted themes) so the 4K artwork breathes directly behind responses.
   - `border: none !important;`, `box-shadow: none !important;` — remove card hover bounce (`translateY`), corner SVG clutter on message cards, and heavy inner borders on `[data-step-index]` and `[data-testid="worked-for-collapsible"]`. Preserve crisp readability with a subtle `text-shadow`.
2. **FORBIDDEN: Thick/Neon Glow Borders on Composer, User Bubbles, and Menus**:
   - **Chat Input (`.surface-composer` & `.surface-composer:focus-within`)**: **NEVER** apply glowing `linear-gradient` border frames (`frameBg`), `padding: 1.5px` fake border wrappers, or neon `box-shadow` glows (`0 0 14px ...`). Render a clean smoked-glass surface with an ultra-thin `1px solid rgba(255,255,255,0.08)` hairline (`rgba(255,255,255,0.16)` max on `:focus-within`).
   - **User Message Bubbles (`.agy-user-bubble-frame` & `.agy-user-bubble`)**: **NEVER** wrap with glowing gradient frames or corner filigree SVGs. Use calm smoked glass (`rgba(${overlayRgb}, 0.36)`) with a `1px solid rgba(255,255,255,0.08)` hairline.
   - **Menus, Sidebar, Buttons & Panels**: **NEVER** add neon/bright outlines around `.agy-button-custom`, `[data-testid="overview-panel"]`, sidebar rows, titlebar items, side-panel tabs, or portal tooltips/menus (`rgba(255,255,255,0.07)` subtle hairlines only).
3. **Zero Live Blur & Zero `:has()`**:
   - **Zero** live CSS `backdrop-filter: blur(...)` anywhere on DOM surfaces (use `syncPrebakedGlass` offscreen textures only).
   - **Zero** new `:has(...)` selectors in injected stylesheets.

### `vfxSpec` Contract

| Section | Field | Allowed Values | Rules |
| :--- | :--- | :--- | :--- |
| `leftColumn` | `surfaceMode` | `'smoked-glass' \| 'matte-tint' \| 'rail-accent'` | Calm smoked rail surface without heavy box borders |
| `leftColumn` | `density` | `'compact' \| 'balanced' \| 'spacious'` | Sidebar row vertical rhythm |
| `leftColumn` | `borderHairline` | `'subtle' \| 'accent-left' \| 'none'` | `1px` edge separation (`accent-left` marks active row) |
| `leftColumn` | `showOrnament` | `boolean` | Non-overlapping corner accent only |
| `centerStage` | `cardStyle` | `'glass-card' \| 'editorial-sheet' \| 'hud-hairline'` | Near-transparent `0.14–0.20` AI responses; no thick/neon borders |
| `centerStage` | `radiusPx` | `number` (`8..16`) | Consistent corner radius across center cards & docked composer |
| `centerStage` | `typographyVibe` | `'sans' \| 'mono' \| 'serif'` | Theme-matched font mood |
| `centerStage` | `contrastFloor` | `'wcag-aa-dark' \| 'wcag-aa-light'` | Legible text over transparent smoked glass |
| `rightColumn` | `panelMode` | `'unified-glass' \| 'clean-slate' \| 'split-accent'` | Sidecar panel surface treatment |
| `rightColumn` | `sashGlow` | `'subtle' \| 'crisp' \| 'none'` | `1px` hairline sash divider |
| `rightColumn` | `tabIndicator` | `'underline' \| 'pill' \| 'dot'` | Clean active tab indicator |
| `motionRules` | `budget` | `'calm' \| 'atmospheric' \| 'kinetic'` | `calm`: `0` particles; `atmospheric`: `6–7`; `kinetic`: `8` |
| `motionRules` | `particleCount` | `number` (`0` or `6..8`) | GPU-composited ambient particles |
| `motionRules` | `particleOpacity` | `[number, number]` | Within `[0.22, 0.42]` |

---

## Step 3: Smooth Collapsible Columns & Unlocked Center Workspace

1. **Smooth Collapse to Compact Toggle Buttons (0px Reclaimed Space)**:
   - Left Column (`data-agy-left-col`), Right Column (`data-agy-right-col`), and Top Menu Bar (`data-agy-top-menubar`) each pair with a compact persistent toggle button (`#agy-collapse-left-btn`, `#agy-collapse-right-btn`, `#agy-collapse-topbar-btn`, persisted in `localStorage`).
   - Collapsing animates smoothly (`transition: width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease, transform 0.28s ease`) and shrinks the collapsed container to **`0px`** (`width: 0` / `height: 0`), leaving zero dead whitespace.
2. **Unlocked Center Stage Width**:
   - Override Antigravity's hardcoded `768px` cap on `[data-testid="conversation-view"] .mx-auto.w-full` up to `min(1240px, calc(100% - 24px))` (and `calc(100% - 20px)` when either side column is collapsed) so code blocks, diffs, and responses use the full freed canvas.
3. **Unblocked Sidebar Click Hitboxes**:
   - Always keep `[role="navigation"][aria-label="Sidebar"]`, `[data-testid="conversation-list-sidebar"]`, and `[data-testid="conversation-row-sidebar"]` at `-webkit-app-region: no-drag; pointer-events: auto;` without distorting virtual-list positioning or trapping focus when the Pet composer is open.

---

## Step 4: Input-Synchronized `8×11` Pet + Native Composer Under Pet's Feet

1. **Input-Synchronized `8×11` Pet Atlas (`petDirective`)**:
   - `theme_designer.js` passes `sourceImagePath` to `generatePetSprite(...)` in parallel with `generateBrandLogo(...)`.
   - **Character / Creature Present (`hasCharacter: true`)**: Match the real character/creature from `sourceImagePath` (silhouette, hair/ears/horns, eyes, outfit colors, held `prop`). Set `sourceObject: ""`.
   - **No Character Present (`hasCharacter: false`)**: Personify **1 iconic main object** from `sourceImagePath` (`sourceObject` -> `personifiedConcept`), preserving its materials and palette.
   - Output atlas: `1536×2288` transparent WebP (`8×11` grid of `192×208` cells, `#00FF00` chroma-keyed + edge-despilled, saved to `themes/user_media/pet_<slug>.webp`, fallback `assets/pets/rocky.webp`).
2. **Native `.surface-composer` Docked Under Pet's Feet**:
   - **Never** replace the native composer with a fake `<textarea>` — keep the real `.surface-composer` (`+` attachments, model picker, `@`, `/`, voice, Turbo) intact.
   - When `.agy-pet-chat-docked` is active, `[data-agy-composer-wrap="1"]` collapses its flow height to `0px` so the conversation list expands full-height; clicking `#agy-better-pet` or `#agy-better-pet-pill` lifts the Pet smoothly if needed and reveals the real `.surface-composer` (`position: fixed`) cleanly **directly beneath the Pet's feet & pill** (`top = pillRect.bottom + 8px`, clean smoked glass without neon borders).

### `petDirective` Contract

| Field | Type | Rules |
| :--- | :--- | :--- |
| `hasCharacter` | `boolean` | `true` if image has a character/creature; `false` when personifying `sourceObject` |
| `sourceObject` | `string` | Iconic object from `sourceImagePath` when `hasCharacter` is `false` (`""` when `true`) |
| `personifiedConcept` | `string` | Visual mascot description for sprite synthesis and tooltip |
| `petName` | `string` | Short companion name (1–2 words) |
| `style` | `'pixel' \| 'plush' \| 'sticker' \| 'vector'` | `'pixel'` default for crisp `image-rendering: pixelated` |
| `palette` | `string[]` | 3–4 hex colors sampled from the image |
| `idleMood` | `string` | Mood slug (e.g. `"calm-focus"`, `"fierce-guard"`, `"cozy-warmth"`) |
| `prop` | `string` | Small consistent held/worn prop across all 11 rows |
| `signatureAction` | `string` | Gesture for `waving` / `jumping` rows |
| `spritePrompt` | `string` | Explicit synthesis prompt passed alongside `sourceImagePath` |
| `animationMood` | `string` | Motion temperament slug |

### `desktop-agent_pet` v2 Atlas Layout (`1536×2288`, `8×11` @ `192×208`)

| Row | State | Columns | Durations / Angles |
| :--- | :--- | :---: | :--- |
| `0` | `idle` | `0–5` | `280, 110, 110, 140, 140, 320 ms` (× `IDLE_MULTIPLIER = 6`) |
| `1` | `running-right` | `0–7` | `120 ms` each, final `220 ms` |
| `2` | `running-left` | `0–7` | `120 ms` each, final `220 ms` |
| `3` | `waving` | `0–3` | `140 ms` each, final `280 ms` |
| `4` | `jumping` | `0–4` | `140 ms` each, final `280 ms` |
| `5` | `failed` | `0–7` | `140 ms` each, final `240 ms` |
| `6` | `waiting` | `0–5` | `150 ms` each, final `260 ms` |
| `7` | `running` | `0–5` | `120 ms` each, final `220 ms` |
| `8` | `review` | `0–5` | `150 ms` each, final `280 ms` |
| `9` | `look directions A` | `0–7` | `000°, 022.5°, 045°, 067.5°, 090°, 112.5°, 135°, 157.5°` |
| `10` | `look directions B` | `0–7` | `180°, 202.5°, 225°, 247.5°, 270°, 292.5°, 315°, 337.5°` |
