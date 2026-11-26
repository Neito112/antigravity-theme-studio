window.__AGY_LAZY_BOOT__ = function(ctx, forceReplay = false) {
  const {
    BOOT_ASSETS,
    THEMES,
    getDefaultThemeKey,
    getState,
    resolveMediaUrl,
    sanitizeCssUrl,
    resolveDynamicPack,
    syncDynamicFxLayer,
    removeDynamicHudWidgets,
    syncBetterPet,
    clearBootTimers,
    stopBootAudio,
    teardownBootOverlay,
    scheduleRevealWhenReady,
    escapeHtml,
  } = ctx;
  const esc = typeof escapeHtml === 'function'
    ? escapeHtml
    : (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DEFAULT_SIGIL_SVG_INNER = '<path d="M12 2.5L14.8 9.2L21.5 12L14.8 14.8L12 21.5L9.2 14.8L2.5 12L9.2 9.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M12 6.5L16.5 12L12 17.5L7.5 12Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3 4" fill="none"/>';
  const ALLOWED_SVG_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'g']);

  function unwrapAndSanitizeSvg(raw) {
    if (!raw || typeof raw !== 'string') return { inner: '', viewBox: '0 0 24 24' };
    let viewBox = '0 0 24 24';
    let body = raw.trim();
    const svgMatch = body.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/i);
    if (svgMatch) {
      const vbMatch = svgMatch[1].match(/\bviewBox\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
      if (vbMatch) {
        const cand = (vbMatch[1] || vbMatch[2] || '').trim();
        if (/^-?\d+(?:\.\d+)?(?:\s+|,)+-?\d+(?:\.\d+)?(?:\s+|,)+\d+(?:\.\d+)?(?:\s+|,)+\d+(?:\.\d+)?$/.test(cand)) {
          viewBox = cand.replace(/,/g, ' ');
        }
      }
      body = svgMatch[2];
    }
    let s = body
      .replace(/<(script|foreignObject|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|foreignObject|style)\b[^>]*\/?>/gi, '');
    s = s.replace(/<(\/?)([a-zA-Z0-9:_-]+)([^>]*)>/g, (full, slash, tagName, attrs) => {
      const tag = String(tagName).toLowerCase();
      if (!ALLOWED_SVG_TAGS.has(tag)) return '';
      if (slash === '/') return `</${tag}>`;
      const isSelfClosing = /\/\s*$/.test(attrs);
      let cleanAttrs = isSelfClosing ? attrs.replace(/\/\s*$/, '') : attrs;
      cleanAttrs = cleanAttrs
        .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s(?:href|xlink:href|src)\s*=\s*(?:"[^"]*(?:javascript:|vbscript:|data:text\/html)[^"]*"|'[^']*(?:javascript:|vbscript:|data:text\/html)[^']*'|[^\s>]*javascript:[^\s>]*)/gi, '')
        .replace(/javascript\s*:/gi, '');
      return `<${tag}${cleanAttrs}${isSelfClosing ? ' /' : ''}>`;
    });
    const inner = s.trim();
    const hasShape = /<(path|circle|ellipse|rect|polygon|polyline|line)\b/i.test(inner);
    return { inner: hasShape ? inner : '', viewBox };
  }

  function resolveBootFontStack(fontVibe) {
    if (fontVibe === 'mono') return 'ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace';
    if (fontVibe === 'serif') return 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif';
    if (fontVibe === 'display') return '"Orbitron", "Rajdhani", "Segoe UI", system-ui, sans-serif';
    return 'system-ui, -apple-system, "Segoe UI", sans-serif';
  }

  function safeCssColor(val, fallback) {
    const s = String(val || '').trim();
    if (!s || /[;{}<>]/.test(s)) return fallback;
    return s;
  }

  function buildDefaultCornerDataUri(primary, secondary) {
    const p = encodeURIComponent(primary);
    const s = encodeURIComponent(secondary);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44' fill='none'%3E%3Cpath d='M3 28 L3 9 Q3 3 9 3 L28 3' stroke='${p}' stroke-width='1.7' stroke-linecap='round' opacity='0.88'/%3E%3Cpath d='M7 20 L7 11 Q7 7 11 7 L20 7' stroke='${s}' stroke-width='1.1' stroke-linecap='round' opacity='0.72'/%3E%3Ccircle cx='7.5' cy='7.5' r='1.8' fill='${p}' opacity='0.9'/%3E%3C/svg%3E`;
  }

  function mountBootSequence(forceReplay = false) {
    const st = getState();
    if (!forceReplay && !st.bootIntro) {
      return;
    }
    window.__AGY_BOOT_PLAYED__ = true;
    teardownBootOverlay();
    window.__AGY_BOOT_TIMERS__ = window.__AGY_BOOT_TIMERS__ || [];

    const activeThemeName = ctx.themeName || st.themeName || (typeof getDefaultThemeKey === 'function' ? getDefaultThemeKey() : 'CUSTOM STUDIO');
    const mainTheme = ctx.mainTheme || (THEMES && THEMES[activeThemeName]) || {};
    const pack = ctx.pack || (typeof resolveDynamicPack === 'function' ? resolveDynamicPack(mainTheme) : {});
    const ui = pack.uiDesign || mainTheme.uiDesign || {};
    const vfxCenter = (mainTheme.vfxSpec && mainTheme.vfxSpec.centerStage) || {};
    const fontVibe = ctx.fontVibe || ui.fontVibe || vfxCenter.typographyVibe || 'sans';
    const fontVibeStack = resolveBootFontStack(fontVibe);

    const primary = safeCssColor(ctx.primary || mainTheme.primary, '#60a5fa');
    const secondary = safeCssColor(ctx.secondary || mainTheme.secondary, primary);
    const glow = safeCssColor(ctx.glow || mainTheme.glow, 'rgba(96, 165, 250, 0.35)');
    const secondaryGlow = safeCssColor(ctx.secondaryGlow || mainTheme.secondaryGlow, glow);

    const workIdentity = ctx.workIdentity || pack.workIdentity || mainTheme.workIdentity || {};
    const petMeta = (mainTheme.petMeta && typeof mainTheme.petMeta === 'object') ? mainTheme.petMeta : {};
    const petDirective = (mainTheme.petDirective && typeof mainTheme.petDirective === 'object') ? mainTheme.petDirective : {};
    const hudWidget = ctx.hudWidget || ui.hudWidget || {};
    const voiceWelcome = ctx.voiceWelcome || pack.voiceWelcome || mainTheme.voiceWelcome || '';

    const rawEmblem = ctx.emblemSvgInner || ui.emblemSvgInner || mainTheme.emblemSvgInner || '';
    const rawSigil = ctx.sigilSvgInner || workIdentity.sigilSvgInner || rawEmblem || DEFAULT_SIGIL_SVG_INNER;
    const sigilParsedInitial = unwrapAndSanitizeSvg(rawSigil);
    const sigilParsed = sigilParsedInitial.inner ? sigilParsedInitial : unwrapAndSanitizeSvg(DEFAULT_SIGIL_SVG_INNER);
    const emblemParsedInitial = unwrapAndSanitizeSvg(rawEmblem || rawSigil);
    const emblemParsed = emblemParsedInitial.inner ? emblemParsedInitial : sigilParsed;
    const hasCustomSigil = true;

    const rawBrandLogo = ctx.brandLogoUrl || mainTheme.brandLogoUrl || workIdentity.brandLogoUrl || '';
    const resolvedBrandLogo = rawBrandLogo ? resolveMediaUrl(rawBrandLogo) : '';
    const brandLogoSrc = (resolvedBrandLogo && !/^\s*(?:javascript|vbscript|data:text\/html)/i.test(resolvedBrandLogo))
      ? resolvedBrandLogo
      : '';

    const rawPrimaryTitle = String(
      workIdentity.brandTitle
      || mainTheme.brandTitle
      || workIdentity.franchise
      || mainTheme.name
      || activeThemeName
      || 'CUSTOM STUDIO'
    ).trim();
    const cleanBrandLabel = (s) => String(s || '').replace(/antigravity/gi, activeThemeName || 'CUSTOM STUDIO').trim();

    const characterName = cleanBrandLabel(
      workIdentity.characterName
      || petMeta.petName
      || petDirective.petName
      || hudWidget.title
      || activeThemeName
      || 'COMPANION'
    );
    const franchise = cleanBrandLabel(
      workIdentity.franchise
      || rawPrimaryTitle
    );
    const bootTagline = cleanBrandLabel(
      workIdentity.bootTagline
      || workIdentity.tagline
      || mainTheme.concept
      || hudWidget.subtitle
      || pack.archetypeLabel
      || 'SYNTHESIZE INTELLIGENCE'
    );

    const brandTitle = cleanBrandLabel(rawPrimaryTitle || franchise).toUpperCase();
    const brandSub = bootTagline.toUpperCase();
    const characterUpper = characterName.toUpperCase();
    const statusBadge = cleanBrandLabel(workIdentity.badge || hudWidget.badge || 'SYNC').toUpperCase();
    const statusCheck = cleanBrandLabel(hudWidget.statusText || workIdentity.focusLabel || 'PERMISSION AUTHORIZED').toUpperCase();
    const operatorName = cleanBrandLabel(workIdentity.operator || characterName || 'SENSEI').toUpperCase();
    const welcomeSubline = voiceWelcome
      ? cleanBrandLabel(voiceWelcome).toUpperCase()
      : `CHÀO MỪNG ${operatorName} • ${brandTitle} READY`;

    const starfieldUrl = sanitizeCssUrl(resolveMediaUrl(BOOT_ASSETS.starfieldBg || 'assets/starfield-boot-bg.jpg'));
    const rawWallpaper = ctx.wallpaper || st.customWp || mainTheme.wallpaper || mainTheme.wallpaperUrl || '';
    const wallpaperUrl = rawWallpaper ? sanitizeCssUrl(resolveMediaUrl(rawWallpaper)) : '';
    const bgPosition = safeCssColor(mainTheme.bgPosition, 'center center');
    const pureBg = (!wallpaperUrl && mainTheme.pureBg && !/[;{}<>]/.test(mainTheme.pureBg))
      ? mainTheme.pureBg
      : '';

    const rawCorner = ctx.cornerSvg || mainTheme.cornerSvg || '';
    const cornerUrl = sanitizeCssUrl(rawCorner ? resolveMediaUrl(rawCorner) : buildDefaultCornerDataUri(primary, secondary));

    const rawAgentAvatar = ctx.agentAvatar
      || (st.agentAvatar && st.agentAvatar !== 'none' ? st.agentAvatar : '')
      || mainTheme.agentAvatar
      || '';
    const agentAvatarUrl = rawAgentAvatar ? sanitizeCssUrl(resolveMediaUrl(rawAgentAvatar)) : '';

    const rawPetSprite = ctx.petSpriteUrl || mainTheme.petSpriteUrl || '';
    const petSpriteUrl = rawPetSprite ? sanitizeCssUrl(resolveMediaUrl(rawPetSprite)) : '';

    const voiceUrls = {
      1: resolveMediaUrl(BOOT_ASSETS.voice1 || 'assets/voice/tawa_voice1.mp3'),
      2: resolveMediaUrl(BOOT_ASSETS.voice2 || 'assets/voice/tawa_voice2.mp3'),
      3: resolveMediaUrl(BOOT_ASSETS.voice3 || 'assets/voice/tawa_voice3.mp3'),
      4: resolveMediaUrl(BOOT_ASSETS.voice4 || 'assets/voice/tawa_voice4.mp3')
    };

    const renderSigilSvg = (parsed, gradId, extraClass = '') => {
      const gradRef = `url(#${gradId})`;
      return `
        <svg class="agy-sigil-svg-mark ${extraClass}" viewBox="${esc(parsed.viewBox)}" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="${gradId}" x1="10%" y1="90%" x2="88%" y2="12%">
              <stop offset="0%" stop-color="${esc(primary)}" />
              <stop offset="55%" stop-color="${esc(secondary)}" />
              <stop offset="100%" stop-color="${esc(primary)}" />
            </linearGradient>
          </defs>
          <g class="agy-sigil-mark-group" style="--agy-sigil-grad:${gradRef}">${parsed.inner}</g>
        </svg>
      `;
    };

    const emblemBadgeHtml = `<span class="agy-boot-emblem" aria-hidden="true">${renderSigilSvg(emblemParsed, 'agyBootHeaderGrad')}</span>`;

    const renderPortraitMini = (sizeClass = 'is-sm') => {
      if (agentAvatarUrl) {
        return `<div class="agy-boot-badge ${sizeClass} is-avatar" style="background-image:url('${agentAvatarUrl}')" role="img" aria-label="${esc(characterName)}"></div>`;
      }
      if (petSpriteUrl) {
        return `<div class="agy-boot-badge ${sizeClass} is-pet" role="img" aria-label="${esc(characterName)}"><div class="agy-boot-pet-crop" style="background-image:url('${petSpriteUrl}')"></div></div>`;
      }
      return '';
    };

    const renderIdentityBadge = (sizeClass = 'is-md', gradId = 'agyBootBadgeGrad') => {
      const portrait = renderPortraitMini(sizeClass);
      if (portrait) return portrait;
      return `<div class="agy-boot-badge ${sizeClass} is-sigil" aria-hidden="true">${renderSigilSvg(sigilParsed, gradId)}</div>`;
    };

    const miniPetChipHtml = (agentAvatarUrl && petSpriteUrl)
      ? `<div class="agy-boot-pet-mini" title="${esc(characterName)}"><div class="agy-boot-pet-crop" style="background-image:url('${petSpriteUrl}')"></div></div>`
      : '';

    const splashPortraitHtml = renderPortraitMini('is-sm');
    const morphPortraitHtml = renderPortraitMini('is-sm');
    const welcomePortraitHtml = renderPortraitMini('is-lg');

    const morphGraphicHtml = `
      <svg class="agy-icon-outline-svg agy-sigil-svg" id="agy-icon-outline-svg" viewBox="${esc(sigilParsed.viewBox)}" fill="none">
        <defs>
          <linearGradient id="agyBootStrokeGrad" x1="10%" y1="90%" x2="88%" y2="12%">
            <stop offset="0%" stop-color="${esc(primary)}" />
            <stop offset="50%" stop-color="${esc(secondary)}" />
            <stop offset="100%" stop-color="${esc(primary)}" />
          </linearGradient>
        </defs>
        <g id="agy-sigil-stroke-group" class="agy-sigil-stroke-group">${sigilParsed.inner}</g>
      </svg>
      <svg class="agy-icon-color-fill agy-sigil-fill-svg" id="agy-boot-color-fill" viewBox="${esc(sigilParsed.viewBox)}" fill="none">
        <defs>
          <linearGradient id="agyBootFillGrad" x1="10%" y1="90%" x2="88%" y2="12%">
            <stop offset="0%" stop-color="${esc(primary)}" />
            <stop offset="55%" stop-color="${esc(secondary)}" />
            <stop offset="100%" stop-color="${esc(primary)}" />
          </linearGradient>
        </defs>
        <g id="agy-sigil-fill-group" class="agy-sigil-fill-group">${sigilParsed.inner}</g>
      </svg>
    `;

    const wallpaperLayerStyle = wallpaperUrl
      ? `background: url("${wallpaperUrl}") ${bgPosition} / cover no-repeat;`
      : (pureBg ? `background: ${pureBg};` : 'background: transparent;');

    const bootStyle = document.createElement('style');
    bootStyle.id = 'agy-boot-styles';
    bootStyle.textContent = `
      #agy-boot-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483050;
        background: #020307;
        --agy-font-vibe: ${fontVibeStack};
        --agy-boot-primary: ${primary};
        --agy-boot-secondary: ${secondary};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 24px 32px;
        font-family: ui-monospace, 'JetBrains Mono', 'Cascadia Mono', Consolas, monospace;
        color: #f4f4f5;
        overflow: hidden;
        transition: background-color 0.6s ease, opacity 0.65s ease;
        user-select: none;
      }
      #agy-boot-overlay.hud-mode { background: #04060b; }
      #agy-boot-overlay.done { opacity: 0; pointer-events: none; }
      #agy-boot-overlay.done.instant { display: none; transition: none; }

      #agy-boot-overlay .agy-boot-wallpaper {
        position: absolute;
        inset: 0;
        z-index: 0;
        ${wallpaperLayerStyle}
        opacity: 0;
        transform: scale(1.02);
        transition: opacity 0.95s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1);
        pointer-events: none;
      }
      #agy-boot-overlay.hud-mode .agy-boot-wallpaper {
        opacity: ${wallpaperUrl ? '0.44' : '0.52'};
        transform: scale(1);
      }
      #agy-boot-overlay .agy-boot-starfield {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: url("${starfieldUrl}") center center / cover no-repeat;
        ${wallpaperUrl ? 'mix-blend-mode: screen;' : ''}
        opacity: 0;
        transition: opacity 0.85s ease;
        pointer-events: none;
      }
      #agy-boot-overlay.hud-mode .agy-boot-starfield {
        opacity: ${wallpaperUrl ? '0.36' : '0.52'};
      }
      #agy-boot-overlay .agy-boot-vignette {
        position: absolute;
        inset: 0;
        z-index: 0;
        background:
          radial-gradient(circle at 50% 46%, ${secondaryGlow} 0%, rgba(4, 6, 12, 0.36) 36%, rgba(2, 4, 9, 0.88) 100%),
          radial-gradient(ellipse at 18% 14%, ${glow} 0%, transparent 50%),
          linear-gradient(180deg, rgba(2, 4, 10, 0.62) 0%, rgba(2, 4, 10, 0.24) 45%, rgba(2, 4, 10, 0.78) 100%);
        opacity: 0;
        transition: opacity 0.85s ease;
        pointer-events: none;
      }
      #agy-boot-overlay.hud-mode .agy-boot-vignette { opacity: 1; }

      #agy-boot-overlay .agy-hud-corner {
        position: absolute;
        width: 44px;
        height: 44px;
        z-index: 2;
        pointer-events: none;
        background-image: url("${cornerUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        opacity: 0;
        transition: opacity 0.6s ease;
      }
      #agy-boot-overlay.hud-mode .agy-hud-corner { opacity: 0.85; }
      #agy-boot-overlay .agy-hud-corner.tl { top: 10px; left: 10px; }
      #agy-boot-overlay .agy-hud-corner.tr { top: 10px; right: 10px; transform: scaleX(-1); }
      #agy-boot-overlay .agy-hud-corner.bl { bottom: 10px; left: 10px; transform: scaleY(-1); }
      #agy-boot-overlay .agy-hud-corner.br { bottom: 10px; right: 10px; transform: scale(-1, -1); }

      #agy-boot-overlay .agy-splash-sheen {
        position: absolute;
        inset: -30%;
        z-index: 3;
        pointer-events: none;
        transform: translateX(-85%);
        background: linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.06) 48%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.05) 52%, transparent 62%);
      }
      #agy-boot-overlay .agy-splash-sheen.run { animation: agyDiagSheen 1.25s cubic-bezier(0.25,0.1,0.25,1) forwards; }
      @keyframes agyDiagSheen { from { transform: translateX(-85%); } to { transform: translateX(85%); } }

      #agy-boot-overlay .agy-hud-scanline {
        position: absolute; left: 0; right: 0; height: 42px; z-index: 4; pointer-events: none; opacity: 0;
        background: linear-gradient(180deg, transparent, ${glow}, transparent);
      }
      #agy-boot-overlay .agy-hud-scanline.sweep { animation: agyHudScan 0.85s ease-out forwards; }
      @keyframes agyHudScan {
        0% { top: 8%; opacity: 0; }
        25% { opacity: 0.9; }
        100% { top: 92%; opacity: 0; }
      }

      #agy-flash-curtain {
        position: fixed;
        inset: 0;
        z-index: 2147483051;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(circle at 82% 85%, rgba(255,255,255,0.92) 0%, ${glow} 48%, rgba(8,12,20,0.65) 100%);
      }
      #agy-flash-curtain.burst { animation: agyFlashBurst 1.15s cubic-bezier(0.22,1,0.36,1) forwards; }
      @keyframes agyFlashBurst { 0% { opacity: 0; } 28% { opacity: 0.9; } 100% { opacity: 0; } }

      #agy-boot-overlay .agy-boot-header,
      #agy-boot-overlay .agy-boot-footer {
        position: relative; z-index: 5; display: flex; justify-content: space-between;
        font-size: 10.5px; letter-spacing: 0.14em; color: #94a3b8; opacity: 0; transition: opacity 0.45s ease;
      }
      #agy-boot-overlay .agy-boot-header { align-items: flex-start; padding: 6px 14px 0; }
      #agy-boot-overlay .agy-boot-footer { align-items: center; padding: 0 14px 18px; }
      #agy-boot-overlay.hud-mode .agy-boot-header,
      #agy-boot-overlay.hud-mode .agy-boot-footer { opacity: 1; }

      #agy-boot-overlay .agy-boot-brand { display: flex; flex-direction: column; gap: 3px; }
      #agy-boot-overlay .agy-boot-brand-row { display: flex; align-items: center; gap: 9px; }
      #agy-boot-overlay .agy-boot-emblem {
        display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px;
        border-radius: 6px; border: 1px solid ${primary}; background: rgba(5, 8, 16, 0.78);
        color: ${primary}; box-shadow: 0 0 12px ${glow}; flex: none;
      }
      #agy-boot-overlay .agy-boot-emblem svg { width: 18px; height: 18px; display: block; }
      #agy-boot-overlay .agy-sigil-svg-mark { width: 100%; height: 100%; display: block; }
      #agy-boot-overlay .agy-sigil-mark-group :is(path, circle, ellipse, rect, polygon, polyline, line) {
        stroke: var(--agy-sigil-grad, ${primary});
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #agy-boot-overlay .agy-sigil-mark-group :is(path, circle, ellipse, rect, polygon, polyline, line)[stroke="none"] {
        stroke: none;
      }
      #agy-boot-overlay .agy-sigil-mark-group :is(path, circle, ellipse, rect, polygon, polyline, line)[fill="currentColor"] {
        fill: var(--agy-sigil-grad, ${primary});
      }
      #agy-boot-overlay .agy-boot-brand strong {
        font-size: 14px; color: #ffffff; letter-spacing: 0.16em;
        font-family: var(--agy-font-vibe); font-weight: 700;
      }
      #agy-boot-overlay .agy-boot-brand .sub-line { font-size: 9px; color: #cbd5e1; letter-spacing: 0.2em; }
      #agy-boot-overlay .agy-boot-rev { margin-top: 8px; font-size: 9.5px; color: #94a3b8; display: flex; align-items: center; gap: 8px; }
      #agy-boot-overlay .agy-boot-rev .blue-rev { color: ${primary}; text-shadow: 0 0 8px ${glow}; }
      #agy-boot-overlay .agy-boot-rev .sec-rev { color: ${secondary}; }

      #agy-boot-overlay .agy-boot-skip {
        cursor: pointer; background: rgba(6, 10, 18, 0.65); border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px; color: #cbd5e1; padding: 5px 12px; font-family: inherit;
        font-size: 10px; letter-spacing: 0.16em; transition: color 0.15s ease, border-color 0.15s ease;
      }
      #agy-boot-overlay .agy-boot-skip:hover { color: #ffffff; border-color: ${primary}; }

      #agy-boot-overlay .agy-boot-stage-wrap {
        position: relative; z-index: 5; flex: 1; display: flex; align-items: center; justify-content: center;
      }
      #agy-boot-overlay .agy-boot-stage {
        display: none; flex-direction: column; align-items: center; text-align: center; max-width: 600px; width: 100%;
      }
      #agy-boot-overlay .agy-boot-stage.active { display: flex; }

      #agy-boot-overlay .agy-stagger-char {
        display: inline-block; opacity: 0; transform: translateY(2px);
        animation: agyCharFadeIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards;
      }
      #agy-boot-overlay .agy-stagger-space { display: inline-block; width: 0.32em; }
      @keyframes agyCharFadeIn { to { opacity: 1; transform: translateY(0); } }
      #agy-boot-overlay .wipe-out { opacity: 0; transition: opacity 0.28s ease; }
      #agy-boot-overlay .stage-fade-out { opacity: 0 !important; transform: scale(1.05); transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1); }
      #agy-boot-overlay .agy-welcome-reveal { opacity: 0; transform: translateY(6px); animation: agyWelcomeIn 0.48s cubic-bezier(0.22,1,0.36,1) forwards; }
      @keyframes agyWelcomeIn { to { opacity: 1; transform: translateY(0); } }

      #agy-boot-overlay .agy-splash-emblem-row {
        display: inline-flex; align-items: center; justify-content: center; gap: 14px;
        margin-bottom: 16px; opacity: 0; animation: agySplashFade 2.5s ease forwards;
      }
      #agy-boot-overlay .agy-splash-logo {
        width: 82px; height: 82px; display: inline-flex; align-items: center; justify-content: center;
        padding: 12px; border-radius: 18px;
        border: 1px solid ${primary}; background: rgba(6, 10, 18, 0.74);
        filter: drop-shadow(0 0 22px ${glow}) drop-shadow(0 0 10px ${secondaryGlow});
      }
      #agy-boot-overlay .agy-splash-logo.has-brand-logo { padding: 8px; }
      #agy-boot-overlay .agy-brand-logo-img {
        width: 100%; height: 100%; object-fit: contain; display: block; border-radius: 10px;
      }
      #agy-boot-overlay .agy-boot-badge.is-brand-logo { padding: 4px; }
      #agy-boot-overlay .agy-splash-wordmark {
        font-family: var(--agy-font-vibe); font-size: 17px; font-weight: 700; letter-spacing: 0.34em;
        color: #ffffff; margin-bottom: 6px; opacity: 0; text-shadow: 0 0 16px ${glow};
        animation: agySplashFade 2.5s ease 0.15s forwards;
      }
      #agy-boot-overlay .agy-splash-caption {
        font-size: 9.5px; letter-spacing: 0.32em; color: ${secondary}; opacity: 0; animation: agySplashFade 2.5s ease 0.25s forwards;
      }
      @keyframes agySplashFade {
        0% { opacity: 0; transform: scale(0.95); }
        20% { opacity: 1; transform: scale(1); }
        76% { opacity: 1; }
        100% { opacity: 0; }
      }

      #agy-boot-overlay .agy-hud-title {
        font-family: var(--agy-font-vibe); font-size: 26px; font-weight: 600; letter-spacing: 0.18em; color: #f8fafc;
        text-shadow: 0 0 18px ${glow};
      }
      #agy-boot-overlay .agy-hud-subtitle { font-size: 10.5px; letter-spacing: 0.34em; color: ${secondary}; margin-bottom: 24px; }
      #agy-boot-overlay .agy-stage1-pill {
        display: inline-flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 6px 14px 6px 8px;
        border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(7, 11, 20, 0.78);
        box-shadow: 0 0 18px ${glow};
      }
      #agy-boot-overlay .agy-stage1-pill-text {
        display: flex; flex-direction: column; text-align: left; gap: 1px;
      }
      #agy-boot-overlay .agy-stage1-pill-name {
        font-family: var(--agy-font-vibe); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #f8fafc;
      }
      #agy-boot-overlay .agy-stage1-pill-sub {
        font-size: 9px; letter-spacing: 0.14em; color: #94a3b8;
      }

      #agy-boot-overlay .agy-hud-btn {
        position: relative; overflow: hidden; cursor: pointer; background: rgba(8, 12, 22, 0.72);
        border: 1px solid ${primary}; border-radius: 6px; color: #f1f5f9; padding: 10px 28px;
        box-shadow: 0 0 16px ${glow};
        font-family: inherit; font-size: 11px; letter-spacing: 0.2em; transition: border-color 0.2s ease, color 0.2s ease, transform 0.12s ease;
      }
      #agy-boot-overlay .agy-hud-btn::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, ${primary}, ${secondary});
        transform: scaleX(0); transform-origin: left center;
        transition: transform 0.28s cubic-bezier(0.22,1,0.36,1); z-index: 0;
      }
      #agy-boot-overlay .agy-hud-btn span { position: relative; z-index: 1; }
      #agy-boot-overlay .agy-hud-btn:hover::before,
      #agy-boot-overlay .agy-hud-btn.triggered::before { transform: scaleX(1); }
      #agy-boot-overlay .agy-hud-btn:hover,
      #agy-boot-overlay .agy-hud-btn.triggered { color: #05070c; border-color: ${secondary}; font-weight: 700; }
      #agy-boot-overlay .agy-hud-btn:active { transform: scale(0.98); }
      #agy-boot-overlay .agy-hud-hint { margin-top: 12px; font-size: 9.5px; color: #94a3b8; letter-spacing: 0.14em; }

      #agy-boot-overlay .agy-boot-badge {
        flex: none; display: inline-flex; align-items: center; justify-content: center;
        overflow: hidden; border: 1px solid ${primary}; background: rgba(8, 13, 24, 0.85);
        box-shadow: 0 0 14px ${glow};
      }
      #agy-boot-overlay .agy-boot-badge.is-sm { width: 30px; height: 30px; border-radius: 999px; }
      #agy-boot-overlay .agy-boot-badge.is-md { width: 54px; height: 54px; border-radius: 12px; }
      #agy-boot-overlay .agy-boot-badge.is-lg { width: 58px; height: 58px; border-radius: 14px; }
      #agy-boot-overlay .agy-boot-badge.is-avatar { background-size: cover; background-position: center; }
      #agy-boot-overlay .agy-boot-badge.is-pet,
      #agy-boot-overlay .agy-boot-badge.is-sigil { padding: 3px; color: ${primary}; }
      #agy-boot-overlay .agy-boot-badge.is-sigil svg { width: 76%; height: 76%; }
      #agy-boot-overlay .agy-boot-pet-crop {
        width: 100%; height: 100%; aspect-ratio: 192 / 208;
        background-repeat: no-repeat; background-size: 800% 1100%; background-position: 0% 0%;
        image-rendering: pixelated;
      }
      #agy-boot-overlay .agy-boot-pet-mini {
        width: 34px; height: 37px; flex: none; padding: 2px; border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.18); background: rgba(7, 11, 20, 0.82);
        box-shadow: 0 0 10px ${secondaryGlow};
      }

      #agy-boot-overlay .agy-id-card {
        position: relative; width: 380px; max-width: calc(100vw - 48px);
        padding: 18px 20px 14px; margin-bottom: 18px; border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(6, 10, 18, 0.78);
        box-shadow: 0 10px 34px rgba(0, 0, 0, 0.52), 0 0 24px ${glow};
      }
      #agy-boot-overlay .agy-card-corner {
        position: absolute; width: 22px; height: 22px; pointer-events: none;
        background-image: url("${cornerUrl}"); background-size: contain; background-repeat: no-repeat; opacity: 0.9;
      }
      #agy-boot-overlay .agy-card-corner.tl { top: 4px; left: 4px; }
      #agy-boot-overlay .agy-card-corner.tr { top: 4px; right: 4px; transform: scaleX(-1); }
      #agy-boot-overlay .agy-card-corner.bl { bottom: 4px; left: 4px; transform: scaleY(-1); }
      #agy-boot-overlay .agy-card-corner.br { bottom: 4px; right: 4px; transform: scale(-1, -1); }

      #agy-boot-overlay .agy-id-hero {
        display: flex; align-items: center; gap: 14px; padding-bottom: 12px; margin-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.09); text-align: left;
      }
      #agy-boot-overlay .agy-id-hero-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      #agy-boot-overlay .agy-id-hero-name {
        font-family: var(--agy-font-vibe); font-size: 16px; font-weight: 700; letter-spacing: 0.1em;
        color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #agy-boot-overlay .agy-id-hero-franchise {
        font-size: 10px; font-weight: 600; letter-spacing: 0.16em; color: ${primary};
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #agy-boot-overlay .agy-id-hero-tagline {
        font-size: 9.5px; letter-spacing: 0.08em; color: #cbd5e1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      #agy-boot-overlay .agy-id-table { width: 100%; padding: 2px 0; display: flex; flex-direction: column; gap: 7px; font-size: 10px; }
      #agy-boot-overlay .agy-id-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      #agy-boot-overlay .agy-id-row span:first-child { color: #94a3b8; letter-spacing: 0.12em; flex: none; }
      #agy-boot-overlay .agy-id-row span:last-child { color: #f8fafc; font-weight: 600; letter-spacing: 0.12em; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      #agy-boot-overlay .agy-icon-morph-box { position: relative; width: 118px; height: 118px; margin: 10px 0 16px; display: flex; align-items: center; justify-content: center; }
      #agy-boot-overlay .agy-icon-outline-svg { position: absolute; inset: 0; width: 100%; height: 100%; transition: opacity 0.45s ease; }
      #agy-boot-overlay .agy-icon-outline-svg.fade-stroke { opacity: 0; }
      #agy-boot-overlay .agy-icon-outline-path {
        fill: none; stroke: url(#agyBootStrokeGrad); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round;
        filter: drop-shadow(0 0 6px ${glow});
      }
      #agy-boot-overlay .agy-icon-outline-path.trace { animation: agyTraceOutline 1.05s cubic-bezier(0.35,0.05,0.25,1) forwards; }
      #agy-boot-overlay .agy-sigil-stroke-group :is(path, circle, ellipse, rect, polygon, polyline, line) {
        fill: none !important;
        stroke: url(#agyBootStrokeGrad) !important;
        stroke-width: 2.6 !important;
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 6px ${glow});
      }
      #agy-boot-overlay .agy-sigil-trace-el.trace {
        animation: agyTraceOutline 0.92s cubic-bezier(0.35,0.05,0.25,1) forwards;
      }
      @keyframes agyTraceOutline { to { stroke-dashoffset: 0; } }

      #agy-boot-overlay .agy-icon-color-fill {
        position: absolute; inset: 0; width: 100%; height: 100%; display: block;
        clip-path: inset(100% 0 0 0); opacity: 0;
        transition: clip-path 1.05s cubic-bezier(0.35,0.05,0.25,1), opacity 0.18s ease, filter 0.45s ease;
      }
      #agy-boot-overlay .agy-icon-color-fill.filled { clip-path: inset(0% 0 0 0); opacity: 1; filter: drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 8px ${secondaryGlow}); }
      #agy-boot-overlay .agy-sigil-fill-svg {
        color: ${primary};
        clip-path: inset(100% 0 0 0);
      }
      #agy-boot-overlay .agy-sigil-fill-svg.filled {
        clip-path: inset(0% 0 0 0);
        opacity: 1;
        filter: drop-shadow(0 0 20px ${glow}) drop-shadow(0 0 8px ${secondaryGlow});
      }
      #agy-boot-overlay .agy-sigil-fill-group :is(path, circle, ellipse, rect, polygon, polyline, line) {
        stroke: url(#agyBootFillGrad);
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #agy-boot-overlay .agy-sigil-fill-group :is(path, circle, ellipse, rect, polygon, polyline, line)[stroke="none"] {
        stroke: none;
      }
      #agy-boot-overlay .agy-sigil-fill-group :is(path, circle, ellipse, rect, polygon, polyline, line)[fill="currentColor"] {
        fill: url(#agyBootFillGrad);
      }
      #agy-boot-overlay .agy-morph-identity {
        display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 2px;
      }

      #agy-boot-overlay .agy-dot-grid-small { font-size: 10px; letter-spacing: 0.42em; color: #cbd5e1; line-height: 1.8; }
      #agy-boot-overlay .agy-hex-column {
        position: absolute; right: 36px; top: 50%; transform: translateY(-50%); font-size: 9.5px; line-height: 1.85;
        color: rgba(248, 250, 252, 0.34); letter-spacing: 0.16em; text-align: right; pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
      }
      #agy-boot-overlay .agy-hex-column.visible { opacity: 1; }

      #agy-boot-overlay .agy-verify-ring-stage { position: relative; width: 390px; height: 390px; display: flex; align-items: center; justify-content: center; }
      #agy-boot-overlay .agy-arc-svg { position: absolute; inset: 0; width: 100%; height: 100%; animation: agySpinCW 4.2s linear infinite; }
      #agy-boot-overlay .agy-arc-svg-inner { position: absolute; inset: 28px; width: calc(100% - 56px); height: calc(100% - 56px); animation: agySpinCCW 5.5s linear infinite; }
      #agy-boot-overlay .agy-orbit-dots { position: absolute; inset: 42px; border-radius: 50%; animation: agySpinCW 3.4s linear infinite; }
      #agy-boot-overlay .agy-orbit-dot { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: ${primary}; box-shadow: 0 0 8px ${glow}; }
      #agy-boot-overlay .agy-orbit-dot.w { background: ${secondary}; width: 3.5px; height: 3.5px; box-shadow: 0 0 8px ${secondaryGlow}; }
      @keyframes agySpinCW { to { transform: rotate(360deg); } }
      @keyframes agySpinCCW { to { transform: rotate(-360deg); } }

      #agy-boot-overlay .agy-welcome-eyebrow { font-family: var(--agy-font-vibe); font-size: 16px; font-weight: 700; letter-spacing: 0.26em; color: #f4f4f5; margin-bottom: 10px; }
      #agy-boot-overlay .agy-welcome-solid-box {
        background: linear-gradient(120deg, ${primary}, ${secondary}); color: #05070c; padding: 5px 20px; border-radius: 4px;
        font-family: var(--agy-font-vibe); font-size: 17px; font-weight: 800; letter-spacing: 0.16em; margin-bottom: 20px; box-shadow: 0 0 28px ${glow};
      }
      #agy-boot-overlay .agy-welcome-flare-wrap { position: relative; min-width: 220px; height: 64px; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }

      #agy-boot-overlay .agy-bottom-progress-track {
        position: absolute; left: 50%; transform: translateX(-50%); width: 33.33vw; max-width: 440px;
        bottom: 4px; height: 2px; background: rgba(255,255,255,0.14);
      }
      #agy-boot-overlay .agy-bottom-progress-bar {
        width: 0%; height: 100%;
        background: linear-gradient(90deg, ${primary}, ${secondary});
        box-shadow: 0 0 10px ${glow}; transition: width 0.55s cubic-bezier(0.22,1,0.36,1);
      }
      #agy-boot-overlay .agy-eq-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 11px; margin-right: 10px; }
      #agy-boot-overlay .agy-eq-bars span { width: 2px; background: ${primary}; animation: agyEqPulse 0.9s ease-in-out infinite alternate; }
      #agy-boot-overlay .agy-eq-bars span:nth-child(2) { background: ${secondary}; animation-delay: 0.2s; }
      #agy-boot-overlay .agy-eq-bars span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes agyEqPulse { from { height: 3px; opacity: 0.45; } to { height: 11px; opacity: 1; } }
    `;
    (document.head || document.documentElement).appendChild(bootStyle);
    const bootMount = document.documentElement || document.body;

    const flashCurtain = document.createElement('div');
    flashCurtain.id = 'agy-flash-curtain';
    bootMount.appendChild(flashCurtain);

    const overlay = document.createElement('section');
    overlay.id = 'agy-boot-overlay';
    overlay.setAttribute('aria-label', 'Boot Sequence');
    overlay.innerHTML = `
      <div class="agy-boot-wallpaper"></div>
      <div class="agy-boot-starfield"></div>
      <div class="agy-boot-vignette"></div>
      <div class="agy-hud-corner tl" aria-hidden="true"></div>
      <div class="agy-hud-corner tr" aria-hidden="true"></div>
      <div class="agy-hud-corner bl" aria-hidden="true"></div>
      <div class="agy-hud-corner br" aria-hidden="true"></div>
      <div class="agy-splash-sheen" id="agy-splash-sheen"></div>
      <div class="agy-hud-scanline" id="agy-hud-scanline"></div>

      <header class="agy-boot-header">
        <div class="agy-boot-brand">
          <div class="agy-boot-brand-row">
            ${emblemBadgeHtml}
            <strong>${esc(brandTitle)}</strong>
          </div>
          <span class="sub-line">${esc(brandSub)}</span>
          <div class="agy-boot-rev">
            <span>${esc(statusBadge)}</span>
            <span>•</span>
            <span class="sec-rev">${esc(characterUpper)}</span>
            <span>•</span>
            <span class="blue-rev" id="agy-hud-clock">WEB PROFILE 00:00:00</span>
          </div>
        </div>
        <button class="agy-boot-skip" id="agy-boot-skip" type="button">SKIP ▸</button>
      </header>

      <div class="agy-boot-stage-wrap">
        <div class="agy-boot-stage active" id="agy-stage-0">
          <div class="agy-splash-emblem-row">
            <div class="agy-splash-logo${brandLogoSrc ? ' has-brand-logo' : ''}" id="agy-splash-logo" aria-hidden="true">${
              brandLogoSrc
                ? `<img class="agy-brand-logo-img" data-agy-fallback-grad="agyBootSplashGrad" src="${esc(brandLogoSrc)}" alt="${esc(brandTitle)}" />`
                : renderSigilSvg(sigilParsed, 'agyBootSplashGrad')
            }</div>
            ${brandLogoSrc ? `<div class="agy-boot-badge is-sm is-sigil" aria-hidden="true">${renderSigilSvg(sigilParsed, 'agyBootSplashMiniGrad')}</div>` : ''}
            ${splashPortraitHtml}
          </div>
          <div class="agy-splash-wordmark">${esc(brandTitle)}</div>
          <div class="agy-splash-caption">${esc(brandSub)}</div>
        </div>

        <div class="agy-boot-stage" id="agy-stage-1">
          <div class="agy-stage1-pill">
            ${renderIdentityBadge('is-sm')}
            <div class="agy-stage1-pill-text">
              <span class="agy-stage1-pill-name">${esc(characterUpper)}</span>
              <span class="agy-stage1-pill-sub">${esc(brandTitle)}</span>
            </div>
          </div>
          <div style="margin-bottom:6px"><span class="agy-hud-title" data-stagger="26">YÊU CẦU QUYỀN TRUY CẬP</span></div>
          <div class="agy-hud-subtitle" data-stagger="14">ACCESS PERMISSION REQUIRED</div>
          <button class="agy-hud-btn" id="agy-btn-grant" type="button">
            <span>CẤP QUYỀN &nbsp; GRANT ACCESS</span>
          </button>
          <div class="agy-hud-hint">Nhấn Enter / Space hoặc bấm 1 lần để khởi chạy</div>
        </div>

        <div class="agy-boot-stage" id="agy-stage-2">
          <div style="margin-bottom:6px"><span class="agy-hud-title" data-stagger="26">XÁC MINH DANH TÍNH</span></div>
          <div class="agy-hud-subtitle" data-stagger="14" style="margin-bottom:16px">IDENTITY VERIFICATION</div>
          <div class="agy-id-card">
            <div class="agy-card-corner tl" aria-hidden="true"></div>
            <div class="agy-card-corner tr" aria-hidden="true"></div>
            <div class="agy-card-corner bl" aria-hidden="true"></div>
            <div class="agy-card-corner br" aria-hidden="true"></div>
            <div class="agy-id-hero">
              ${renderIdentityBadge('is-md')}
              <div class="agy-id-hero-meta">
                <div class="agy-id-hero-name">${esc(characterName)}</div>
                <div class="agy-id-hero-franchise">${esc(brandTitle)}</div>
                <div class="agy-id-hero-tagline">${esc(bootTagline)}</div>
              </div>
              ${miniPetChipHtml}
            </div>
            <div class="agy-id-table">
              <div class="agy-id-row"><span>NHÂN VẬT / OPERATOR</span><span>${esc(operatorName)}</span></div>
              <div class="agy-id-row"><span>THEME / FRANCHISE</span><span>${esc(brandTitle)}</span></div>
              <div class="agy-id-row"><span>TRẠNG THÁI / STATUS</span><span>${esc(statusBadge)}</span></div>
            </div>
          </div>
          <button class="agy-hud-btn" id="agy-btn-confirm" type="button">
            <span>XÁC NHẬN &nbsp; CONFIRM IDENTITY</span>
          </button>
          <div class="agy-hud-hint">Tự động chuyển tiếp sau giây lát · Bấm hoặc Enter để đi nhanh</div>
        </div>

        <div class="agy-boot-stage" id="agy-stage-morph">
          <div style="margin-bottom:6px"><span class="agy-hud-title" id="agy-morph-title" data-stagger="16">ĐANG TIẾP NHẬN YÊU CẦU</span></div>
          <div class="agy-hud-subtitle" id="agy-morph-sub" data-stagger="10" style="margin-bottom:10px">ACCESS REQUEST RECEIVED</div>
          <div class="agy-icon-morph-box">
            ${morphGraphicHtml}
          </div>
          <div class="agy-morph-identity">
            ${morphPortraitHtml}
            <div class="agy-dot-grid-small">${esc(brandTitle)} · ${esc(characterUpper)}<br />· · · · · · · · · ·</div>
          </div>
        </div>

        <div class="agy-boot-stage" id="agy-stage-5">
          <div class="agy-verify-ring-stage">
            <svg class="agy-arc-svg" viewBox="0 0 320 320">
              <circle cx="160" cy="160" r="146" fill="none" stroke="${esc(primary)}" stroke-width="3.2" stroke-dasharray="430 140 160 220" stroke-linecap="round" />
              <circle cx="160" cy="14" r="4.5" fill="${esc(secondary)}" />
            </svg>
            <svg class="agy-arc-svg-inner" viewBox="0 0 264 264">
              <circle cx="132" cy="132" r="122" fill="none" stroke="${esc(secondary)}" stroke-opacity="0.34" stroke-width="1" stroke-dasharray="6 10" />
            </svg>
            <div class="agy-orbit-dots">
              <div class="agy-orbit-dot" style="top:12%;left:32%"></div>
              <div class="agy-orbit-dot w" style="top:28%;right:14%"></div>
              <div class="agy-orbit-dot" style="bottom:18%;left:22%"></div>
              <div class="agy-orbit-dot w" style="bottom:24%;right:28%"></div>
            </div>
            <div>
              <div class="agy-hud-title" data-stagger="24" style="font-size:17px;letter-spacing:0.1em;margin-bottom:6px">HOÀN TẤT · ĐÃ XÁC THỰC</div>
              <div class="agy-hud-subtitle" data-stagger="14" style="margin-bottom:0;font-size:9px;letter-spacing:0.24em">${esc(statusCheck)}</div>
            </div>
          </div>
        </div>

        <div class="agy-boot-stage" id="agy-stage-6">
          <div class="agy-welcome-eyebrow" data-stagger="28">WELCOME TO</div>
          <div class="agy-welcome-solid-box agy-welcome-reveal" style="animation-delay:240ms">${esc(brandTitle)}</div>
          <div class="agy-welcome-flare-wrap agy-welcome-reveal" style="animation-delay:360ms">
            ${brandLogoSrc
              ? `<div class="agy-boot-badge is-lg is-brand-logo"><img class="agy-brand-logo-img" data-agy-fallback-grad="agyBootWelcomeGrad" src="${esc(brandLogoSrc)}" alt="${esc(brandTitle)}" /></div>`
              : `<div class="agy-boot-badge is-lg is-sigil" aria-hidden="true">${renderSigilSvg(sigilParsed, 'agyBootWelcomeGrad')}</div>`
            }
            ${brandLogoSrc ? `<div class="agy-boot-badge is-sm is-sigil" aria-hidden="true">${renderSigilSvg(sigilParsed, 'agyBootWelcomeMiniGrad')}</div>` : ''}
            ${welcomePortraitHtml}
            ${miniPetChipHtml}
          </div>
          <div class="agy-dot-grid-small agy-welcome-reveal" style="margin-bottom:8px;animation-delay:460ms">${esc(brandSub)}</div>
          <div class="agy-hud-hint agy-welcome-reveal" style="color:#cbd5e1;letter-spacing:0.2em;animation-delay:540ms">${esc(welcomeSubline)}</div>
        </div>
      </div>

      <div class="agy-hex-column" id="agy-hex-column"></div>

      <footer class="agy-boot-footer">
        <div style="display:flex;align-items:center">
          <div class="agy-eq-bars"><span></span><span></span><span></span></div>
          <span id="agy-boot-step-label">[ 01 / 06 ] AUTHORIZATION</span>
        </div>
        <span id="agy-boot-status-bottom">AWAITING OPERATOR CONSENT</span>
        <span>${esc(statusBadge)} // ${esc(characterUpper)}</span>
        <div class="agy-bottom-progress-track">
          <div class="agy-bottom-progress-bar" id="agy-bottom-progress"></div>
        </div>
      </footer>
    `;
    (document.documentElement || document.body).appendChild(overlay);

    overlay.querySelectorAll('.agy-brand-logo-img').forEach((imgEl) => {
      imgEl.addEventListener('error', () => {
        const host = imgEl.parentElement;
        if (!host) return;
        const gradId = imgEl.getAttribute('data-agy-fallback-grad') || 'agyBootFallbackGrad';
        host.classList.remove('has-brand-logo', 'is-brand-logo');
        host.classList.add('is-sigil');
        host.innerHTML = renderSigilSvg(sigilParsed, gradId);
      }, { once: true });
    });

    const splashSheen = document.getElementById('agy-splash-sheen');
    const hudScanline = document.getElementById('agy-hud-scanline');
    const stepLabel = document.getElementById('agy-boot-step-label');
    const statusBottom = document.getElementById('agy-boot-status-bottom');
    const bottomProgress = document.getElementById('agy-bottom-progress');
    const hexColumn = document.getElementById('agy-hex-column');
    const hudClock = document.getElementById('agy-hud-clock');
    const morphTitle = document.getElementById('agy-morph-title');
    const morphSub = document.getElementById('agy-morph-sub');
    const iconOutlineSvg = document.getElementById('agy-icon-outline-svg');
    const colorFillEl = document.getElementById('agy-boot-color-fill');

    let traceTargets = [];
    let longestTraceEl = null;
    traceTargets = Array.from(iconOutlineSvg.querySelectorAll(
      '#agy-sigil-stroke-group path, #agy-sigil-stroke-group circle, #agy-sigil-stroke-group ellipse, #agy-sigil-stroke-group rect, #agy-sigil-stroke-group polygon, #agy-sigil-stroke-group polyline, #agy-sigil-stroke-group line'
    ));
    let maxLen = -1;
    traceTargets.forEach((el) => {
      let len = 120;
      try {
        if (typeof el.getTotalLength === 'function') {
          const measured = el.getTotalLength();
          if (Number.isFinite(measured) && measured > 0) len = Math.ceil(measured);
        }
      } catch (_) {}
      el.dataset.strokeLen = String(len);
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      el.classList.add('agy-sigil-trace-el');
      if (len > maxLen) {
        maxLen = len;
        longestTraceEl = el;
      }
    });

    let currentStage = 0;
    let grantTriggered = false;
    let confirmTriggered = false;
    let stage2AutoTimer = null;
    let bootActx = null;
    const bootStartMs = performance.now();

    function playClickSfx(freq = 640, dur = 0.06, vol = 0.045) {
      try {
        bootActx = bootActx || new (window.AudioContext || window.webkitAudioContext)();
        if (bootActx.state === 'suspended') bootActx.resume();
        const osc = bootActx.createOscillator();
        const g = bootActx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, bootActx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.45, bootActx.currentTime + dur);
        g.gain.setValueAtTime(vol, bootActx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, bootActx.currentTime + dur);
        osc.connect(g);
        g.connect(bootActx.destination);
        osc.start();
        osc.stop(bootActx.currentTime + dur);
      } catch (e) {}
    }

    function playTawaVoice(slotNum) {
      stopBootAudio();
      const src = voiceUrls[slotNum];
      if (!src) return;
      try {
        const audio = new Audio(src);
        audio.volume = 0.92;
        window.__AGY_BOOT_AUDIO__ = audio;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    function triggerScanline() {
      hudScanline.classList.remove('sweep');
      void hudScanline.offsetWidth;
      hudScanline.classList.add('sweep');
    }

    function startHexStream(active) {
      if (window.__AGY_BOOT_HEX__) {
        clearInterval(window.__AGY_BOOT_HEX__);
        window.__AGY_BOOT_HEX__ = null;
      }
      hexColumn.classList.toggle('visible', active);
      if (!active) return;
      const gen = () => {
        const lines = [];
        for (let i = 0; i < 6; i++) {
          const val = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
          lines.push(`0x${val} :: READ`);
        }
        hexColumn.innerHTML = lines.join('<br>');
      };
      gen();
      window.__AGY_BOOT_HEX__ = setInterval(gen, 110);
    }

    function applyCharStagger(el, stepMs = 24, baseDelayMs = 0) {
      if (!el) return;
      const raw = el.dataset.rawText || el.textContent.trim();
      el.dataset.rawText = raw;
      el.innerHTML = '';
      Array.from(raw).forEach((ch, idx) => {
        if (ch === ' ') {
          const sp = document.createElement('span');
          sp.className = 'agy-stagger-space';
          el.appendChild(sp);
        } else {
          const span = document.createElement('span');
          span.className = 'agy-stagger-char';
          span.textContent = ch;
          span.style.animationDelay = `${baseDelayMs + idx * stepMs}ms`;
          el.appendChild(span);
        }
      });
    }

    function showStage(idx, withCharAnim = true) {
      currentStage = idx;
      const ids = ['agy-stage-0', 'agy-stage-1', 'agy-stage-2', 'agy-stage-morph', 'agy-stage-morph', 'agy-stage-5', 'agy-stage-6'];
      const targetId = ids[idx];
      ['agy-stage-0', 'agy-stage-1', 'agy-stage-2', 'agy-stage-morph', 'agy-stage-5', 'agy-stage-6'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('wipe-out', 'stage-fade-out');
        el.classList.toggle('active', id === targetId);
      });
      if (withCharAnim && idx > 0) {
        const activeEl = document.getElementById(targetId);
        if (activeEl) {
          activeEl.querySelectorAll('[data-stagger]').forEach((el, tIdx) => {
            applyCharStagger(el, parseInt(el.getAttribute('data-stagger') || '24', 10), tIdx * 90);
          });
        }
      }
      const meta = [
        ['[ 00 / 06 ] INITIALIZING', `LOADING ${brandTitle}...`, 10],
        ['[ 01 / 06 ] AUTHORIZATION', 'AWAITING OPERATOR CONSENT', 24],
        ['[ 02 / 06 ] IDENTITY CHECK', `${characterUpper} / ${statusBadge} READY`, 42],
        ['[ 03 / 06 ] ACCESS VECTOR', 'SYNCHRONIZING NEURAL CORE', 58],
        ['[ 04 / 06 ] PERMISSION STREAM', 'STREAMING CLEARANCE KEYS', 74],
        ['[ 05 / 06 ] VERIFY', statusCheck, 90],
        ['[ 06 / 06 ] WELCOME', `${brandTitle} SESSION ACTIVE`, 100]
      ];
      stepLabel.textContent = meta[idx][0];
      statusBottom.textContent = meta[idx][1];
      bottomProgress.style.width = `${meta[idx][2]}%`;
    }

    function activateInsideUiLayers() {
      const curSt = getState();
      if (curSt.themeMode !== 'dynamic') return;
      const curTh = (THEMES && THEMES[curSt.themeName]) || mainTheme;
      if (typeof syncDynamicFxLayer === 'function') syncDynamicFxLayer(true, curTh);
      if (typeof removeDynamicHudWidgets === 'function') removeDynamicHudWidgets();
      if (typeof syncBetterPet === 'function') syncBetterPet(true, curTh, curSt.petEnabled !== false);
    }

    function finishBoot(instant = false) {
      if (stage2AutoTimer) {
        clearTimeout(stage2AutoTimer);
        stage2AutoTimer = null;
      }
      clearBootTimers();
      startHexStream(false);
      window.__AGY_BOOT_FINISHED__ = true;
      if (instant) {
        stopBootAudio();
        overlay.classList.add('done', 'instant');
        scheduleRevealWhenReady(true);
        activateInsideUiLayers();
        return;
      }
      flashCurtain.classList.remove('burst');
      void flashCurtain.offsetWidth;
      flashCurtain.classList.add('burst');
      window.__AGY_BOOT_TIMERS__.push(
        setTimeout(() => {
          overlay.classList.add('done');
          scheduleRevealWhenReady(false);
          activateInsideUiLayers();
          window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
            overlay.style.display = 'none';
          }, 700));
        }, 340)
      );
    }

    function runAutoSequenceAfterConfirm() {
      if (!overlay.isConnected || overlay.classList.contains('done')) return;
      morphTitle.dataset.rawText = 'ĐANG TIẾP NHẬN YÊU CẦU';
      morphTitle.textContent = 'ĐANG TIẾP NHẬN YÊU CẦU';
      morphSub.dataset.rawText = 'ACCESS REQUEST RECEIVED';
      morphSub.textContent = 'ACCESS REQUEST RECEIVED';
      iconOutlineSvg.classList.remove('fade-stroke');
      if (colorFillEl) colorFillEl.classList.remove('filled');
      traceTargets.forEach((el) => {
        el.classList.remove('trace');
        el.style.strokeDashoffset = el.dataset.strokeLen || '120';
      });
      showStage(3, true);
      void iconOutlineSvg.getBoundingClientRect();
      traceTargets.forEach((el, idx) => {
        if (hasCustomSigil && traceTargets.length > 1) {
          el.style.animationDelay = `${Math.min(idx * 40, 180)}ms`;
        }
        el.classList.add('trace');
      });
      playClickSfx(520, 0.06, 0.045);

      let fillPhaseStarted = false;
      const startColorFillStage = () => {
        if (fillPhaseStarted || !overlay.isConnected || overlay.classList.contains('done')) return;
        fillPhaseStarted = true;

        morphTitle.dataset.rawText = 'BẮT ĐẦU ĐỌC QUYỀN HẠN';
        morphTitle.textContent = 'BẮT ĐẦU ĐỌC QUYỀN HẠN';
        morphSub.dataset.rawText = 'PERMISSION READ STARTED';
        morphSub.textContent = 'PERMISSION READ STARTED';
        showStage(4, true);
        startHexStream(true);
        if (colorFillEl) {
          void colorFillEl.getBoundingClientRect();
          colorFillEl.classList.add('filled');
        }
        playClickSfx(620, 0.05, 0.04);

        window.__AGY_BOOT_TIMERS__.push(setTimeout(() => iconOutlineSvg.classList.add('fade-stroke'), 520));

        window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
          startHexStream(false);
          showStage(5, true);
          triggerScanline();
          playClickSfx(780, 0.08, 0.05);
          playTawaVoice(3);
        }, 1250));

        window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
          const st5 = document.getElementById('agy-stage-5');
          if (st5) st5.classList.add('stage-fade-out');
        }, 2950));

        window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
          showStage(6, true);
          playClickSfx(880, 0.1, 0.045);
          playTawaVoice(4);
        }, 3620));

        window.__AGY_BOOT_TIMERS__.push(setTimeout(() => finishBoot(false), 5850));
      };

      if (longestTraceEl) {
        longestTraceEl.addEventListener('animationend', startColorFillStage, { once: true });
      }
      window.__AGY_BOOT_TIMERS__.push(setTimeout(startColorFillStage, 1080));
    }

    function triggerIdentityConfirm(fromUser = false) {
      if (currentStage !== 2 || confirmTriggered || !overlay.isConnected || overlay.classList.contains('done')) return;
      confirmTriggered = true;
      if (stage2AutoTimer) {
        clearTimeout(stage2AutoTimer);
        stage2AutoTimer = null;
      }
      const confirmBtn = document.getElementById('agy-btn-confirm');
      if (confirmBtn) confirmBtn.classList.add('triggered');
      playClickSfx(fromUser ? 820 : 760, 0.06, fromUser ? 0.05 : 0.038);
      playTawaVoice(2);
      const st2 = document.getElementById('agy-stage-2');
      window.__AGY_BOOT_TIMERS__.push(setTimeout(() => st2 && st2.classList.add('wipe-out'), 240));
      window.__AGY_BOOT_TIMERS__.push(setTimeout(() => runAutoSequenceAfterConfirm(), 580));
    }

    window.__AGY_BOOT_CLOCK__ = setInterval(() => {
      const sec = Math.floor((performance.now() - bootStartMs) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      hudClock.textContent = `WEB PROFILE 00:${mm}:${ss}`;
    }, 250);

    showStage(0, false);
    window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
      splashSheen.classList.remove('run');
      void splashSheen.offsetWidth;
      splashSheen.classList.add('run');
    }, 1050));

    window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
      overlay.classList.add('hud-mode');
      showStage(1, true);
      triggerScanline();
    }, 2600));

    document.getElementById('agy-btn-grant').addEventListener('click', (e) => {
      if (currentStage !== 1 || grantTriggered) return;
      grantTriggered = true;
      e.currentTarget.classList.add('triggered');
      playClickSfx(680, 0.06, 0.05);
      playTawaVoice(1);
      const st1 = document.getElementById('agy-stage-1');
      window.__AGY_BOOT_TIMERS__.push(setTimeout(() => st1 && st1.classList.add('wipe-out'), 240));
      window.__AGY_BOOT_TIMERS__.push(setTimeout(() => {
        if (!overlay.isConnected || overlay.classList.contains('done')) return;
        showStage(2, true);
        stage2AutoTimer = setTimeout(() => triggerIdentityConfirm(false), 1150);
        window.__AGY_BOOT_TIMERS__.push(stage2AutoTimer);
      }, 580));
    });

    document.getElementById('agy-btn-confirm').addEventListener('click', () => {
      triggerIdentityConfirm(true);
    });

    document.getElementById('agy-boot-skip').addEventListener('click', () => finishBoot(true));

    window.__AGY_BOOT_KEYDOWN__ = (e) => {
      if (overlay.classList.contains('done')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (currentStage === 1) {
          e.preventDefault();
          e.stopPropagation();
          const btn = document.getElementById('agy-btn-grant');
          if (btn) btn.click();
        } else if (currentStage === 2) {
          e.preventDefault();
          e.stopPropagation();
          triggerIdentityConfirm(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finishBoot(true);
      }
    };
    window.addEventListener('keydown', window.__AGY_BOOT_KEYDOWN__, true);
  }
  return mountBootSequence(forceReplay);
};
