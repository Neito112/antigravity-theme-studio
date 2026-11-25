---
name: ui-vfx-director
description: Transform any wallpaper or reference image analysis into a cohesive UI VFX Blueprint (vfxSpec) and Companion Pet Directive (petDirective) for Antigravity Theme Studio — Fusion Edition, matching the Neito112/desktop-agent_pet v2 sprite contract and zero-jank glass rules.
---

# UI VFX Director

Converts any image analysis into a clean, high-contrast **UI VFX Blueprint (`vfxSpec`)** and **Companion Pet Directive (`petDirective`)** without visual clutter or Electron scroll jank.

## 1. Image Content Analysis

Before choosing tokens or animations, analyze the source image across four axes:

1. **Mood & Lighting**: Identify overall atmosphere (e.g., cozy rain, neon rain, sunlit botanical, abyssal sci-fi, minimal editorial) and light direction/contrast.
2. **Color Temperature & Palette**: Extract `primary` (accent), `secondary` (paired highlight), `overlayRgb` (`"R, G, B"`), and polarity (`isLight: true` for bright/daytime/pastel scenes, `false` for dark/moody scenes).
3. **Subject Presence (`petDirective.hasCharacter`)**:
   - **Character / Creature Present (`hasCharacter: true`)**: Design the companion pet faithfully after the character or creature in the image (silhouette, hair/ears/horns, outfit colors, signature prop). Set `sourceObject: ""`.
   - **No Character Present (`hasCharacter: false`)**: For landscapes, rooms, coffee shops, weapons, mecha, architecture, or abstract art, **personify 1 iconic main object** from the scene into a cute mascot companion (`petDirective.sourceObject` -> `petDirective.personifiedConcept`).
     - Examples:
       - Steaming latte cup -> `"Tiny Cozy Latte Spirit with a whipped-cream beret and warm amber eyes"`
       - Glowing submarine sonar -> `"Chibi Brass Bathyscaphe Sprite with a periscope antenna"`
       - Floating crystal lantern -> `"Little Starlight Lantern Wisp with a brass cap and soft cyan glow"`

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
  "signatureAction": "happy steam puff bounce"
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

---

## 2. UI VFX Blueprint (`vfxSpec`)

Every preset or AI-generated theme produces a `vfxSpec` object targeting Antigravity's three columns and motion layer cleanly.

### Left Column (`leftColumn` — `[role="navigation"][aria-label="Sidebar"]`)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `surfaceMode` | `'smoked-glass' \| 'matte-tint' \| 'rail-accent'` | Pre-baked glass tint or clean matte rail surface |
| `density` | `'compact' \| 'balanced' \| 'spacious'` | Row padding rhythm for conversation rows |
| `borderHairline` | `'subtle' \| 'accent-left' \| 'none'` | Crisp `1px` edge separation (`accent-left` highlights active row) |
| `showOrnament` | `boolean` | Enables a subtle corner/rail ornament cleanly placed so it **never** overlaps sidebar text |

### Center Stage (`centerStage` — Chat Cards, Composer, Code/Step Blocks)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `cardStyle` | `'glass-card' \| 'editorial-sheet' \| 'hud-hairline'` | Strictly subtle `1px` borders — **NO** thick `2.5px` double/dashed clutter boxes |
| `radiusPx` | `number` (`8..16`) | Clean corner radius for `[data-testid="agent-response"]`, `.agy-user-bubble-frame`, `.surface-composer`, and `[data-step-index]` |
| `typographyVibe` | `'sans' \| 'mono' \| 'serif'` | Editorial / technical / classic typography mood |
| `contrastFloor` | `'wcag-aa-dark' \| 'wcag-aa-light'` | Enforces readable smoked glass (`aiCardBg >= 0.84` dark / `0.88` light, `>= 4.5:1` AA minimum, `>= 7:1` AAA target for primary text) |

### Right Column (`rightColumn` — Aux / Sidecar `[data-side-panel-docked]`)

| Field | Allowed Values | Purpose |
| :--- | :--- | :--- |
| `panelMode` | `'unified-glass' \| 'clean-slate' \| 'split-accent'` | Sidecar panel surface treatment |
| `sashGlow` | `'subtle' \| 'crisp' \| 'none'` | `[data-side-panel-sash]` `1px` divider accent |
| `tabIndicator` | `'underline' \| 'pill' \| 'dot'` | Active tab indicator inside `[data-side-panel-strip]` |

### Motion Rules (`motionRules`)

| Field | Allowed Values | Budget & Behavior |
| :--- | :--- | :--- |
| `budget` | `'calm' \| 'atmospheric' \| 'kinetic'` | **calm**: micro-transitions (`150ms`) only, `0` particles.<br>**atmospheric**: `6..8` delicate GPU-composited particles (`opacity: 0.22..0.42`, `6..10px`) + soft corner shimmer.<br>**kinetic**: crisp `1px` hairline accent shimmer + `8` delicate particles + active HUD accent. |
| `particleCount` | `number` (`0` or `6..8`) | `0` for `calm`, `6..8` for `atmospheric`, `8` for `kinetic` |
| `particleOpacity` | `[number, number]` | `[0.22, 0.42]` range for delicate ambient particles (never harsh giant SVGs) |

---

## 3. Non-Negotiable Performance & Cleanliness Guardrails

1. **Zero Live `backdrop-filter: blur()`**: Never apply live CSS `backdrop-filter: blur(...)` on Antigravity DOM surfaces; use offscreen pre-baked glass (`syncPrebakedGlass`) only.
2. **Zero `:has()` Selectors**: Never emit `:has(...)` in injected stylesheets (prevents Electron style-recalc stalls).
3. **Zero Floating Clutter Banners**: Never cover UI text with floating status banners, giant top-bar pills, `body::before` neon bars, or thick `2.5px` `double`/`dashed` borders.
4. **Static Mode Cleanliness**: When the user selects Static mode (`🧊 Tĩnh`), all animations, particles, and `#agy-better-pet` are cleanly disabled/removed.

---

## 4. Companion Pet Sprite Contract (`Neito112/desktop-agent_pet` v2)

All generated or bundled pets conform 1:1 to the `desktop-agent_pet` v2 atlas:

- **Dimensions**: `1536×2288` transparent WebP/PNG (`8 columns × 11 rows`, `192×208` cell size), `spriteVersionNumber: 2`.
- **CSS Rendering**: `background-size: 800% 1100%`, `aspect-ratio: 192 / 208`, `image-rendering: pixelated`, `-webkit-app-region: no-drag`, drag lift `--pet-launch-shift: -16px`.
- **Fallback Sprite**: `"assets/pets/rocky.webp"` (bundled at `themes/assets/pets/rocky.webp`).

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

## 5. Complete Blueprint Example

```json
{
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
    "signatureAction": "twirling halo wave"
  }
}
```
