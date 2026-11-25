# `themes/themes.json` Schema & Antigravity DOM Reference

`themes/themes.json` is a JSON object keyed by display preset name (e.g. `"WLOP Cosmic"`, `"Midnight Obsidian"`). The first entry becomes the default fallback theme when no `theme_config.json` selection is stored.

## Preset Fields

| Key | Type | Required | Purpose |
| :--- | :--- | :--- | :--- |
| `concept` | string | Yes | Short subtitle shown in the theme selector modal |
| `primary` | hex/css color | Yes | Primary accent color (composer focus border, active highlights, accents) |
| `secondary` | hex/css color | Yes | Secondary accent color (paired gradient highlight) |
| `glow` | rgba string | Yes | Primary ambient glow behind active composer / bubbles |
| `secondaryGlow` | rgba string | Yes | Secondary ambient glow |
| `bg` | css background | Yes | User chat bubble gradient/background |
| `frameBg` | css background | Yes | Border/frame gradient around user message / composer frame |
| `textColor` | hex string | Yes | Foreground text inside user bubble (`#f8fafc` recommended) |
| `borderColor` | rgba string | Yes | Subtle border color for composer & interactive cards |
| `innerBorder` | css border | Yes | Inner border shorthand for cards/frames |
| `clearBackdrop` | boolean | Yes | Removes heavy default opaque panels so wallpaper / pureBg breathes |
| `overlayRgb` | `"R, G, B"` | Yes | Base RGB triplet for wallpaper tint/scrim and unified glass overlay |
| `bgPosition` | css background-position | Optional | Focal point alignment (`"center center"`, `"center 20%"`, etc.) |
| `pureBg` | css background | Optional | Pure-CSS multi-layer gradient used when `wallpaper` is `""` |
| `wallpaper` | string | Yes | Relative asset path (`"assets/foo.webp"`), `data:` URI, or `""` for CSS-only |
| `sidebarBg` | rgba string | Yes | Left navigation rail tint |
| `sidebarBlur` | string | Optional | Passed only to offscreen pre-baked texture sampler (`syncPrebakedGlass`) — never applied as live CSS `backdrop-filter` |
| `sidebarHoverBg` | rgba string | Yes | Hover highlight on sidebar conversation rows |
| `sidebarEnhanceText` | boolean | Optional | Adds crisp text-shadow contrast boost on bright/detailed wallpapers |
| `aiCardBg` | rgba string | Yes | Scrim over AI response cards & markdown panels |
| `aiCardBorder` | rgba string | Yes | Border tint for AI response cards |
| `headerBg` | rgba string | Yes | Top bar tint matching the L-shaped unified glass frame |
| `headerBlur` | string | Optional | Pre-bake blur hint for top header glass |
| `headerBorder` | rgba string | Yes | Bottom hairline border of the top bar |
| `unifiedGlass` | boolean | Yes | Enables seamless unified L-glass spanning sidebar + top header |
| `btnBg` | rgba string | Yes | Composer pill/button dark surface (`rgba(15, 30, 58, 0.56)` etc.) |
| `inputGlassBg` | rgba string | Yes | Composer glass backdrop |
| `inputCardBg` | css background | Yes | Composer container gradient |
| `modalBg` | rgba string | Yes | Settings modal surface (`rgba(..., 0.96)` keeps text razor sharp) |
| `modalHeaderBg` | rgba string | Yes | Settings modal header gradient/color |
| `cardBg` | rgba string | Yes | Theme card background inside settings modal |
| `cardSelectedBg` | rgba string | Yes | Active theme card background inside settings modal |
| `isOrnament` | boolean | Optional | True when decorative SVG flourishes (`cornerSvg` / `sticker`) are used |
| `cornerSvg` | string | Optional | Asset path (`"assets/corner.svg"`) or `data:image/svg+xml,...` for corner badges |
| `sticker` | string | Optional | Asset path (`"assets/ornament.svg"`) or `data:image/svg+xml,...` above composer |
| `stickerW`, `stickerH` | number | Optional | Rendered px width & height for `sticker` |
| `stickerTop`, `stickerRight` | number | Optional | Offset px above/right of the composer box |
| `userAvatar` | string | Optional | Circular avatar (`assets/...` or `data:`) rendered next to `[data-testid="user-message"]` |
| `agentAvatar` | string | Optional | Circular avatar (`assets/...` or `data:`) rendered top-left of `[data-testid="agent-response"]` |
| `isLight` | boolean | Optional | Enables Light Mode Glass typography (`#0f172a` ink, frosted light pills, dark window controls) |
| `uiTextColor`, `uiMutedColor` | css color | Optional | Override header/sidebar/body primary and muted ink (defaults adapt to `isLight`) |
| `pillBg`, `pillHoverBg`, `pillTextColor`, `pillBorder` | css color | Optional | Custom styling for composer strip pills (`No Project`, `Local Checkout`, branch trigger) |
| `vfxSpec` | object | Optional | Clean 3-column UI VFX blueprint (`leftColumn`, `centerStage`, `rightColumn`, `motionRules`) |
| `petDirective` | object | Optional | Image-derived companion pet design spec (`hasCharacter`, `sourceObject`, `personifiedConcept`, `petName`, `style`, `palette`, `idleMood`, `prop`, `signatureAction`) |
| `petSpriteUrl` | string | Optional | Relative asset path (`"assets/pets/rocky.webp"`, `"user_media/pet_<slug>.webp"`) for the 8×11 v2 sprite atlas |
| `petId` | string | Optional | Stable pet identifier (e.g. `"rocky"`, `"pet-<slug>"`) |
| `petMeta` | object | Optional | Display metadata (`{ petName, personifiedConcept, style }`) shown in pet hover tooltip |
| `dynamicPack` | object | Optional | Adaptive Dynamic Mode profile (particles, HUD ring, intro overlay, sound profile, voice lines) |

### `dynamicPack` Object

Used in Dynamic Mode (`themeMode === 'dynamic'`) by `engine/core.js` and generated by `daemon/theme_designer.js`. Supports open-ended, image-specific UI geometry, custom SVG particles/HUDs, and synthesized audio parameters:

| Key | Type / Values | Purpose |
| :--- | :--- | :--- |
| `archetype` | open string (kebab-case) | Open-ended theme genre/vibe slug (e.g. `"lofi-rainy-cafe"`, `"abyssal-submarine"`, `"gothic-library"`, `"cyberpunk-netrunner"`, `"cosmic-arcane"`) |
| `archetypeLabel` | string | Short display badge label (e.g. `"Lofi Rainy Cafe"`, `"Abyssal Submarine"`, `"Gothic Library"`) |
| `particleStyle` | open string | Ambient particle motif name (e.g. `"raindrops"`, `"bubbles"`, `"dust-motes"`, `"crystals"`, `"petals"`, `"none"`) |
| `hudRingStyle` | open string | HUD/ring motif name (e.g. `"sonar-rings"`, `"clockwork-gears"`, `"magic-circle"`, `"cyber-radar"`, `"none"`) |
| `soundProfile` | open string | Descriptive sound profile name (e.g. `"lofi-rhodes"`, `"sonar-ping"`, `"crystalline"`, `"warm-bell"`) |
| `uiDesign` | object | Image-tailored full IDE layout, geometry & HUD composition (see `uiDesign Object` below) |
| `particleShape` | open string | Particle shape name (e.g. `"raindrop"`, `"bubble"`, `"maple-leaf"`, `"rune-spark"`) |
| `particleSvgInner` | string (optional) | Safe inline SVG primitives (`<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<polyline>`, `<line>`, `<g>`) inside a `0 0 24 24` viewBox (no `<script>`, `<foreignObject>`, `<style>`, `on*` attrs, or `javascript:`) |
| `particleMotion` | `'fall' \| 'rise' \| 'float' \| 'orbit' \| 'pulse' \| 'drift'` | GPU-composited particle animation trajectory |
| `particleCount` | number (`6..18`) | Number of ambient particles rendered in Dynamic mode |
| `hudSvgInner` | string (optional) | Custom safe inline SVG primitives inside a `0 0 200 200` viewBox tailored to the image (e.g. sonar rings, clockwork gears, coffee steam curves, rune circle, circuit traces) |
| `soundSynth` | object | Custom Web Audio synthesis config: `{ waveform: 'sine' \| 'triangle' \| 'sawtooth' \| 'square', notes: number[] (3–5 Hz values in 150..1600), noteStepMs: number (45..160), decayMs: number (120..500) }` |
| `voicePitch` | number (`0.8..1.25`) | `speechSynthesis` pitch multiplier |
| `voiceRate` | number (`0.85..1.15`) | `speechSynthesis` speaking rate multiplier |
| `introTitle` | string | Uppercase boot overlay headline |
| `introSubtitle` | string | Uppercase boot overlay status line |
| `introChecks` | `string[]` | 3–4 short uppercase `[ OK ]` check labels |
| `voiceWelcome` | string | 4–8 word English `speechSynthesis` greeting on boot/intro |
| `voiceSwitch` | string | 2–5 word English `speechSynthesis` confirmation on theme switch |

### `uiDesign` Object

Controls full Dynamic Mode IDE layout re-composition and floating HUD widgets:

| Key | Type / Values | Purpose |
| :--- | :--- | :--- |
| `fontVibe` | `'sans' \| 'mono' \| 'serif' \| 'display'` | Typography mood across HUD and cards |
| `cardRadiusPx` | number (`4..22`) | Corner radius for cards and panels |
| `borderStyle` | `'solid' \| 'double' \| 'dashed' \| 'glow-frame' \| 'chamfered'` | Card/panel border geometry |
| `accentGlowIntensity` | number (`0.2..1.0`) | Glow intensity multiplier for active borders/HUDs |
| `layoutPreset` | open string | Layout preset slug fitting the image (e.g. `'floating-hud'`, `'orbital-dock'`, `'editorial-glass'`, `'arcade-frame'`, `'minimal-rail'`) |
| `sidebarStyle` | `'floating-cards' \| 'sleek-rail' \| 'framed-panel'` | Left navigation rail layout treatment |
| `composerStyle` | `'floating-dock' \| 'command-bar' \| 'hud-console'` | Chat composer container layout treatment |
| `chatCardLayout` | `'hud-panel' \| 'clean-sheet' \| 'terminal-block' \| 'floating-bubble'` | AI response card layout treatment |
| `dockPosition` | `'right-vertical' \| 'bottom-right' \| 'top-right'` | Floating quick-action dock placement |
| `dockShape` | `'circle' \| 'hex' \| 'pill' \| 'square'` | Quick-action dock button geometry |
| `hudWidget` | `{ badge, title, subtitle, statusText }` | Compact floating status HUD card content (uppercase strings) |
| `topBarPillText` | string | Short uppercase floating top-bar status pill text |

### `vfxSpec` Object

Clean, zero-clutter 3-column UI VFX blueprint (see `skills/ui-vfx-director/SKILL.md`). Enforces **0 live `backdrop-filter: blur()`**, **0 `:has()` selectors**, and **1px subtle borders only**:

| Section | Key | Type / Values | Purpose |
| :--- | :--- | :--- | :--- |
| `leftColumn` | `surfaceMode` | `'smoked-glass' \| 'matte-tint' \| 'rail-accent'` | Left sidebar `[role="navigation"][aria-label="Sidebar"]` surface |
| `leftColumn` | `density` | `'compact' \| 'balanced' \| 'spacious'` | Sidebar row padding rhythm |
| `leftColumn` | `borderHairline` | `'subtle' \| 'accent-left' \| 'none'` | Crisp `1px` edge separation |
| `leftColumn` | `showOrnament` | `boolean` | Non-overlapping corner/rail ornament toggle |
| `centerStage` | `cardStyle` | `'glass-card' \| 'editorial-sheet' \| 'hud-hairline'` | Subtle `1px` card border style (never `2.5px` double/dashed) |
| `centerStage` | `radiusPx` | `number` (`8..16`) | Corner radius for chat cards, composer, and step blocks |
| `centerStage` | `typographyVibe` | `'sans' \| 'mono' \| 'serif'` | Editorial / technical / classic font mood |
| `centerStage` | `contrastFloor` | `'wcag-aa-dark' \| 'wcag-aa-light'` | Smoked glass readability floor (`aiCardBg >= 0.84` dark / `0.88` light) |
| `rightColumn` | `panelMode` | `'unified-glass' \| 'clean-slate' \| 'split-accent'` | Sidecar `[data-side-panel-docked]` surface |
| `rightColumn` | `sashGlow` | `'subtle' \| 'crisp' \| 'none'` | `[data-side-panel-sash]` `1px` divider accent |
| `rightColumn` | `tabIndicator` | `'underline' \| 'pill' \| 'dot'` | Active tab indicator inside `[data-side-panel-strip]` |
| `motionRules` | `budget` | `'calm' \| 'atmospheric' \| 'kinetic'` | `'calm'` = 150ms micro-transitions + 0 particles; `'atmospheric'` = 6–8 subtle particles (`0.22..0.42` opacity) + soft shimmer; `'kinetic'` = hairline shimmer + 8 particles + HUD accent |

### `petDirective` Object

Synchronizes the `Neito112/desktop-agent_pet` v2 (`8×11` @ `192×208`, `1536×2288`) companion pet with the theme image (fallback: `"assets/pets/rocky.webp"`):

| Key | Type | Purpose |
| :--- | :--- | :--- |
| `hasCharacter` | `boolean` | `true` if image depicts a character/creature; `false` when personifying 1 iconic object |
| `sourceObject` | `string` | Iconic object from the image when `hasCharacter` is `false` (`""` when `true`) |
| `personifiedConcept` | `string` | Concise mascot concept for sprite generation & hover tooltip |
| `petName` | `string` | Friendly companion name (1–2 words) |
| `style` | `'pixel' \| 'plush' \| 'sticker' \| 'vector'` | Visual sprite style (`'pixel'` default) |
| `palette` | `string[]` | 3–4 hex colors matching the wallpaper |
| `idleMood` | `string` | Short mood slug |
| `prop` | `string` | Small consistent prop held or worn across rows |
| `signatureAction` | `string` | Expressive gesture for `waving` / `jumping` rows |

## Asset Resolution (`scripts/build_payload.py`)

When compiling `dist/theme_payload.js`:
- Values under `wallpaper`, `sticker`, `cornerSvg`, `userAvatar`, and `agentAvatar` that point to local paths (relative to `themes/`) are inlined into `data:` URIs.
- `.svg` files become URL-encoded `data:image/svg+xml,...`.
- Raster images (`.png`, `.jpg`, `.jpeg`, `.webp`) are resized down to max `3840px` 4K (`256px` for `userAvatar`/`agentAvatar`) and converted to WebP (`quality=90`) when Pillow is installed, keeping 4K sharpness with compact payload size.
- Leave `wallpaper` as `""` and supply `pureBg` for zero-image gradient presets (e.g. `Midnight Obsidian`).

## Antigravity UI Targets Handled by `engine/core.js`

- **Root Shell:** `.agy-shell` receives wallpaper/pureBg framing with `data-agy-hole-active="1"` + `clip-path: polygon(evenodd, ...)` whenever Antigravity opens the split embedded browser (`body[data-has-browser-hole="true"]`).
- **Pre-baked Glass:** Offscreen canvas generates blurred sidebar/header strips only when theme/wallpaper/dimensions change, avoiding per-frame `backdrop-filter: blur(...)` scroll jank.
- **Composer Top Strip Pills:** `[data-testid="project-selector-trigger"]`, `[aria-label="Select Environment"]`, `[data-testid="branch-pill-trigger"]` are given translucent dark badges for contrast over bright wallpapers.
- **Settings Entry & Persistence:** Sidebar trigger `#agy-custom-theme-sidebar-btn` opens the live customizer modal; choices persist across restarts via CDP binding `agySaveThemeConfig` -> `theme_config.json`.
