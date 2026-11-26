---
name: ui-vfx-director
description: Transform any wallpaper or reference image analysis into a cohesive UI VFX Blueprint (vfxSpec), Boot Work Identity (workIdentity), and Input-Synchronized Companion Pet Directive (petDirective) for Antigravity Theme Studio — matching fullscreen 4K floating-card layout, refined game-UI micro-interactions, and Neito112/desktop-agent_pet v2 8x11 spritesheets.
---

# UI VFX Director

Converts any image analysis into a clean, high-contrast **UI VFX Blueprint (`vfxSpec`)**, **Boot & IDE Work Identity (`workIdentity`)**, and **Input-Synchronized Companion Pet Directive (`petDirective`)** without visual clutter or Electron scroll jank.

## 1. Image Content Analysis

Before choosing tokens or animations, analyze the source image across four axes:

1. **Mood & Lighting**: Identify overall atmosphere (e.g., cozy rain, neon rain, sunlit botanical, abyssal sci-fi, minimal editorial) and light direction/contrast.
2. **Color Temperature & Palette**: Extract `primary` (accent), `secondary` (paired highlight), `overlayRgb` (`"R, G, B"`), and polarity (`isLight: false` default dark smoked glass for high-contrast Antigravity readability).
3. **Work & Emblem Identity (`workIdentity`)**:
   - Extract `franchise` (short evocative title/world), `characterName` (character or personified subject name), `operator` (callsign), `bootTagline` (concise boot subtitle), `secondary` (hex/CSS accent matching `theme.secondary`), and `sigilSvgInner` (clean inline SVG vector primitives for `viewBox="0 0 24 24"`, representing the iconic emblem/symbol/object of the artwork — NO `<svg>` wrapper, NO `<script>`, `<image>`, `<foreignObject>`, `<style>`, or `on*` handlers).
   - Shared across both the **1-click Boot Intro (`engine/boot.js`)** (splash/identity badge, `sigilSvgInner` stroke-trace morph, corner ornaments, wallpaper backdrop) and the **in-IDE theme (`engine/core.js`)**.
4. **Subject Presence (`petDirective.hasCharacter`)**:
   - **Character / Creature Present (`hasCharacter: true`)**: Design the companion pet faithfully after the character or creature in the input image (`sourceImagePath` passed directly to `image-generator`: matching silhouette, hair/ears/horns, eyes, outfit colors, signature prop). Set `sourceObject: ""`.
   - **No Character Present (`hasCharacter: false`)**: For landscapes, rooms, coffee shops, weapons, mecha, architecture, or abstract art, **personify 1 iconic main object** directly from `sourceImagePath` into a cute mascot companion (`petDirective.sourceObject` -> `petDirective.personifiedConcept`).
     - Examples:
       - Steaming latte cup -> `"Tiny Cozy Latte Spirit with a whipped-cream beret and warm amber eyes"`
       - Glowing submarine sonar -> `"Chibi Brass Bathyscaphe Sprite with a periscope antenna"`
       - Floating crystal lantern -> `"Little Starlight Lantern Wisp with a brass cap and soft cyan glow"`

### `workIdentity` Contract

```json
{
  "franchise": "STARLIGHT CONCERTO",
  "characterName": "Celestial Violinist",
  "operator": "CONDUCTOR",
  "bootTagline": "HARMONIC RESONANCE // SYNC 100%",
  "secondary": "#f472b6",
  "sigilSvgInner": "<path d=\"M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2Z\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\" fill=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"3\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\"/>"
}
```

### `petDirective` Contract

```json
{
  "hasCharacter": false,
  "sourceObject": "steaming ceramic espresso cup",
  "personifiedConcept": "Tiny Cozy Latte Spirit with a whipped-cream beret and warm amber eyes",
  "petName": "Mocha",
  "style": "pixel",
  "palette": ["#d99b66", "#f5e6d3", "#4a2c1d", "#ffcf87"],
  "idleMood": "content-warmth",
  "prop": "mini saucer",
  "signatureAction": "happy steam puff bounce",
  "spritePrompt": "8x11 pixel chibi mascot sprite atlas of Mocha: Tiny Cozy Latte Spirit with a whipped-cream beret and warm amber eyes, holding mini saucer, content-warmth mood",
  "animationMood": "content-warmth"
}
```

| Field | Type | Rules |
| :--- | :--- | :--- |
| `hasCharacter` | `boolean` | `true` if image depicts a character/creature; `false` if object/scenery personification is used |
| `sourceObject` | `string` | Iconic object from the image when `hasCharacter` is `false` (`""` when `true`) |
| `personifiedConcept` | `string` | Concise visual mascot concept for sprite generation and hover tooltip |
| `petName` | `string` | Short friendly companion name (1–2 words) |
| `style` | `'pixel' \| 'plush' \| 'sticker' \| 'vector'` | Visual rendering style matching the wallpaper aesthetic (`'pixel'` default for crisp `image-rendering: pixelated`) |
| `palette` | `string[]` | 3–4 hex colors sampled from the image + character/object |
| `idleMood` | `string` | Short mood slug (e.g. `"calm-focus"`, `"playful-spark"`, `"sleepy-cozy"`) |
| `prop` | `string` | Small held or worn prop that stays consistent across all 11 sprite rows |
| `signatureAction` | `string` | Expressive gesture for `waving` / `jumping` rows |
| `spritePrompt` | `string` | Explicit visual synthesis prompt passed to `pet_generator.js` alongside `sourceImagePath` |
| `animationMood` | `string` | Motion temperament slug guiding idle/action energy |

---

## 2. Fullscreen 4K Canvas & Floating IDE Blocks (`main`-Style Layout + Game-UI Polish)

The IDE renders a crisp **fullscreen 4K 16:9 (`3840×2160` WebP) wallpaper** (or video) across `.agy-shell`, with Antigravity's functional surfaces floating cleanly above it as **distinct, well-spaced cards**:

- **Separated Floating Surfaces (`margin: ~6px`)**: Left sidebar (`[role="navigation"][aria-label="Sidebar"]`), top title/menu bar (`[data-testid="title-menu-bar"]` / `[data-main-content-header]`), center task/agent cards (`[data-testid="agent-response"]`, `.agy-user-bubble-frame`, `[data-step-index]`, `[data-testid="worked-for-collapsible"]`), and right side panel (`[data-side-panel-docked]`, `[data-side-panel-strip]`) remain cleanly separated with subtle `1px` borders and soft depth shadows so the 4K artwork breathes between panels.
- **Refined Game-UI Micro-Interactions**:
  - Subtle `1px` hover lift (`translateY(-1px)`) + crisp `primary/glow` hairline highlight.
  - Tactile `:active { transform: scale(0.985) }` press feedback on interactive buttons, task cards, and tabs.
  - Compact active tab/menu/step indicator bars (underline/pill/dot) instead of noisy full-box outlines.
  - Synchronized subtle decor (`cornerSvg` corner accents and compact `sticker` ornament) matching the Boot Intro's `workIdentity` without covering text.

---

## 3. UI VFX Blueprint (`vfxSpec`)

Every preset or AI-generated theme produces a `vfxSpec` object targeting Antigravity's three columns and motion layer cleanly.

### Left Column (`leftColumn` — `[role="navigation"][aria-label="Sidebar"]`)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `surfaceMode` | `'smoked-glass' \| 'matte-tint' \| 'rail-accent'` | Pre-baked glass tint or clean matte floating rail surface |
| `density` | `'compact' \| 'balanced' \| 'spacious'` | Row padding rhythm for conversation rows |
| `borderHairline` | `'subtle' \| 'accent-left' \| 'none'` | Crisp `1px` edge separation (`accent-left` highlights active row) |
| `showOrnament` | `boolean` | Enables a subtle corner/rail ornament cleanly placed so it **never** overlaps sidebar text |

### Center Stage (`centerStage` — Chat Cards, Step Blocks, Docked Pet Chat)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `cardStyle` | `'glass-card' \| 'editorial-sheet' \| 'hud-hairline'` | Strictly subtle `1px` borders — **NO** thick `2.5px`/`3px` double/dashed clutter boxes |
| `radiusPx` | `number` (`8..16`) | Clean corner radius for `[data-testid="agent-response"]`, `.agy-user-bubble-frame`, `[data-step-index]`, and `#agy-better-pet-chat` |
| `typographyVibe` | `'sans' \| 'mono' \| 'serif'` | Editorial / technical / classic typography mood |
| `contrastFloor` | `'wcag-aa-dark' \| 'wcag-aa-light'` | Enforces readable smoked glass (`aiCardBg >= 0.84` dark / `0.88` light, `>= 4.5:1` AA minimum, `>= 7:1` AAA target for primary text) |

### Right Column (`rightColumn` — Aux / Sidecar `[data-side-panel-docked]`)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `panelMode` | `'unified-glass' \| 'clean-slate' \| 'split-accent'` | Floating sidecar panel surface treatment |
| `sashGlow` | `'subtle' \| 'crisp' \| 'none'` | `[data-side-panel-sash]` `1px` divider accent |
| `tabIndicator` | `'underline' \| 'pill' \| 'dot'` | Active tab indicator inside `[data-side-panel-strip]` |

### Motion Rules (`motionRules`)

| Field | Allowed Values | Budget & Behavior |
| :--- | :--- | :--- |
| `budget` | `'calm' \| 'atmospheric' \| 'kinetic'` | **calm**: micro-transitions (`150ms`) only, `0` particles.<br>**atmospheric**: `6..8` delicate GPU-composited particles (`opacity: 0.22..0.42`, `6..10px`) + soft corner shimmer.<br>**kinetic**: crisp `1px` hairline accent shimmer + `8` delicate particles + active HUD accent. |
| `particleCount` | `number` (`0` or `6..8`) | `0` for `calm`, `6..8` for `atmospheric`, `8` for `kinetic` |
| `particleOpacity` | `[number, number]` | `[0.22, 0.42]` range for delicate ambient particles (never harsh giant SVGs) |

---

## 4. Non-Negotiable Performance & Cleanliness Guardrails

1. **Zero Live `backdrop-filter: blur()`**: Never apply live CSS `backdrop-filter: blur(...)` on Antigravity DOM surfaces; use offscreen pre-baked glass (`syncPrebakedGlass`) only.
2. **Zero `:has()` Selectors**: Never emit `:has(...)` in injected stylesheets (prevents Electron style-recalc stalls).
3. **Zero Floating Clutter Banners**: Never cover UI text with floating status banners, giant top-bar pills, `body::before` neon bars, or thick `2.5px`/`3px` `double`/`dashed` borders.
4. **Clean SVG Security**: All inline SVG fragments (`sigilSvgInner`, `particleSvgInner`, `hudSvgInner`, `cornerSvgMarkup`, `stickerSvgMarkup`) use geometric primitives only — **no** `<script>`, `<image>`, `<foreignObject>`, `<style>`, `<iframe>`, `on*` handlers, or `javascript:` URLs.
5. **Static Mode Cleanliness**: When the user selects Static mode (`🧊 Tĩnh`), all animations, particles, and `#agy-better-pet` are cleanly disabled/removed.

---

## 5. Companion Pet Sprite Contract (`Neito112/desktop-agent_pet` v2) & Pet Chat UX

All generated or bundled pets conform 1:1 to the `desktop-agent_pet` v2 atlas and synchronize directly with the user's input image:

- **Input-Image Synchronization**: `theme_designer.js` passes `sourceImagePath` (the user's original uploaded image) to `pet_generator.js`, which passes `--add-dir` and `sourceImagePath` directly to `image-generator` so the generated `8×11` sheet matches the real input character (`hasCharacter: true`) or personifies the prominent input object (`hasCharacter: false`), saved to `themes/user_media/pet_<slug>.webp`.
- **Dimensions**: `1536×2288` transparent WebP (`8 columns × 11 rows`, `192×208` cell size), `spriteVersionNumber: 2`, `#00FF00` chroma-keyed + edge-despilled.
- **CSS Rendering**: `background-size: 800% 1100%`, `aspect-ratio: 192 / 208`, `image-rendering: pixelated`, `-webkit-app-region: no-drag`, drag lift `--pet-launch-shift: -16px`.
- **Fallback Sprite**: `"assets/pets/rocky.webp"` (bundled at `themes/assets/pets/rocky.webp`).
- **Pet Pill & Docked Pet Chat**: `#agy-better-pet` pairs with a compact status pill (`#agy-better-pet-pill`) and a click-to-toggle floating chat drawer (`#agy-better-pet-chat`); when `.agy-pet-chat-docked` is active, the center `.surface-composer` collapses cleanly so the conversation workspace expands across the 4K canvas.

| Row | State | Columns | Durations / Angles |
| :--- | :--- | :---: | :--- |
| `0` | `idle` | `0–5` | `280, 110, 110, 140, 140, 320 ms` (resting loop × `IDLE_MULTIPLIER = 6`) |
| `1` | `running-right` | `0–7` | `120 ms` each, final `220 ms` |
| `2` | `running-left` | `0–7` | `120 ms` each, final `220 ms` |
| `3` | `waving` | `0–3` | `140 ms` each, final `280 ms` |
| `4` | `jumping` | `0–4` | `140 ms` each, final `280 ms` |
| `5` | `failed` | `0–7` | `140 ms` each, final `240 ms` |
| `6` | `waiting` | `0–5` | `150 ms` each, final `260 ms` |
| `7` | `running` | `0–5` | `120 ms` each, final `220 ms` |
| `8` | `review` | `0–5` | `150 ms` each, final `280 ms` |
| `9` | `look directions A` | `0–7` | `000°, 022.5°, 045°, 067.5°, 090°, 112.5°, 135°, 157.5°` (`000°` = up / 12 o'clock) |
| `10` | `look directions B` | `0–7` | `180°, 202.5°, 225°, 247.5°, 270°, 292.5°, 315°, 337.5°` |

---

## 6. Complete Blueprint Example

```json
{
  "workIdentity": {
    "franchise": "STARLIGHT CONCERTO",
    "characterName": "Lumina",
    "operator": "MAESTRO",
    "bootTagline": "CELESTIAL RESONANCE // SYNC 100%",
    "secondary": "#f472b6",
    "sigilSvgInner": "<path d=\"M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2Z\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linejoin=\"round\" fill=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"3\" stroke=\"currentColor\" stroke-width=\"1.4\" fill=\"none\"/>"
  },
  "vfxSpec": {
    "leftColumn": {
      "surfaceMode": "smoked-glass",
      "density": "balanced",
      "borderHairline": "subtle",
      "showOrnament": true
    },
    "centerStage": {
      "cardStyle": "glass-card",
      "radiusPx": 12,
      "typographyVibe": "sans",
      "contrastFloor": "wcag-aa-dark"
    },
    "rightColumn": {
      "panelMode": "unified-glass",
      "sashGlow": "subtle",
      "tabIndicator": "underline"
    },
    "motionRules": {
      "budget": "atmospheric",
      "particleCount": 7,
      "particleOpacity": [0.22, 0.38]
    }
  },
  "petDirective": {
    "hasCharacter": true,
    "sourceObject": "",
    "personifiedConcept": "Celestial starlight familiar with flowing ribbon ears and a tiny eclipse halo",
    "petName": "Lumina",
    "style": "pixel",
    "palette": ["#7dd3fc", "#f472b6", "#1e1b4b", "#fef08a"],
    "idleMood": "serene-wonder",
    "prop": "floating starlight prism",
    "signatureAction": "twirling halo wave",
    "spritePrompt": "8x11 pixel chibi mascot sprite atlas of Lumina matching the celestial character in the input image, holding floating starlight prism",
    "animationMood": "serene-wonder"
  }
}
```
