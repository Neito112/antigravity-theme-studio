(() => {
  const THEMES = /*__THEMES_PLACEHOLDER__*/{};
  const BUILTIN_THEMES = { ...THEMES };
  const BUILTIN_KEYS = new Set(Object.keys(BUILTIN_THEMES));
  const THEME_KEYS = Object.keys(THEMES);
  const DEFAULT_THEME_KEY = THEME_KEYS[0] || 'Default';
  const STORAGE_CUSTOM_THEMES = 'agy_custom_themes_v1';
  const STORAGE_HIDDEN_BUILTINS = 'agy_hidden_builtins_v1';
  registerCustomThemes();

  const STORAGE_THEME = 'agy_theme_v3';
  const STORAGE_BUBBLE = 'agy_bubble_v3';
  const STORAGE_INPUT = 'agy_input_v3';
  const STORAGE_DIMMING = 'agy_dimming_v3';
  const STORAGE_WP_ENABLED = 'agy_wp_enabled_v3';
  const STORAGE_CUSTOM_WP = 'agy_custom_wp_v3';
  const STORAGE_USER_AVATAR = 'agy_user_avatar_v3';
  const STORAGE_AGENT_AVATAR = 'agy_agent_avatar_v3';
  const STORAGE_GLASS_BLUR = 'agy_glass_blur_v3';
  const STORAGE_AVATAR_SIZE = 'agy_avatar_size_v3';
  const STORAGE_AVATAR_RADIUS = 'agy_avatar_radius_v3';
  const STORAGE_THEME_MODE = 'agy_theme_mode_v1';

  const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const INPUT_STYLES = {
    'sync': {
      label: 'Synced Ornament Frame',
      desc: 'Follows the active theme borders & decorative SVG ornament'
    },
    'double_gold': {
      label: 'Amber Gold Double Border',
      desc: 'Warm metallic double border with corner filigree'
    },
    'glass': {
      label: 'Translucent Crystal Glass',
      desc: 'Lets more of your background artwork shine through'
    },
    'minimal': {
      label: 'Minimal Clean',
      desc: 'Sleek subtle border without top decorative stickers'
    }
  };

  function getDefaultThemeKey() {
    return (THEMES[DEFAULT_THEME_KEY] ? DEFAULT_THEME_KEY : THEME_KEYS[0]) || DEFAULT_THEME_KEY;
  }

  function getState() {
    const init = window.__AGY_INITIAL_CONFIG__ || {};
    const defKey = getDefaultThemeKey();
    const rawTheme = localStorage.getItem(STORAGE_THEME) || init.themeName || defKey;
    const themeName = THEMES[rawTheme] ? rawTheme : defKey;
    const rawBubble = localStorage.getItem(STORAGE_BUBBLE) || init.bubbleName || themeName;
    const bubbleName = THEMES[rawBubble] ? rawBubble : themeName;
    const inputStyle = localStorage.getItem(STORAGE_INPUT) || init.inputStyle || 'sync';
    const dimming = parseInt(localStorage.getItem(STORAGE_DIMMING) || (init.dimming !== undefined ? init.dimming : '69'), 10);
    const wpEnabled = localStorage.getItem(STORAGE_WP_ENABLED) !== null
      ? localStorage.getItem(STORAGE_WP_ENABLED) !== 'false'
      : (init.wpEnabled !== undefined ? init.wpEnabled : true);
    const customWp = localStorage.getItem(STORAGE_CUSTOM_WP) || init.customWp || '';
    const userAvatar = localStorage.getItem(STORAGE_USER_AVATAR) ?? init.userAvatar ?? '';
    const agentAvatar = localStorage.getItem(STORAGE_AGENT_AVATAR) ?? init.agentAvatar ?? '';
    const rawBlur = localStorage.getItem(STORAGE_GLASS_BLUR) ?? init.glassBlur;
    const glassBlur = rawBlur !== undefined && rawBlur !== null && rawBlur !== '' ? parseInt(rawBlur, 10) : 3;
    const rawAvSize = localStorage.getItem(STORAGE_AVATAR_SIZE) ?? init.avatarSize;
    const avatarSize = rawAvSize !== undefined && rawAvSize !== null && rawAvSize !== '' ? parseInt(rawAvSize, 10) : 32;
    const rawAvRad = localStorage.getItem(STORAGE_AVATAR_RADIUS) ?? init.avatarRadius;
    const avatarRadius = rawAvRad !== undefined && rawAvRad !== null && rawAvRad !== '' ? parseInt(rawAvRad, 10) : 50;
    const rawMode = localStorage.getItem(STORAGE_THEME_MODE) || init.themeMode || 'dynamic';
    const themeMode = rawMode === 'static' ? 'static' : 'dynamic';
    return { themeName, bubbleName, inputStyle, dimming, wpEnabled, customWp, userAvatar, agentAvatar, glassBlur, avatarSize, avatarRadius, themeMode };
  }

  // Downscale user/agent avatar uploads to 192x192 WebP once so theme_config.json stays tiny
  function compressAvatarFile(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 192;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const natW = img.naturalWidth || size;
          const natH = img.naturalHeight || size;
          const side = Math.min(natW, natH);
          const sx = Math.max(0, Math.floor((natW - side) / 2));
          const sy = Math.max(0, Math.floor((natH - side) / 2));
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          const out = canvas.toDataURL('image/webp', 0.88);
          callback(out && out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/png'));
        } catch (e) {
          callback(String(reader.result || ''));
        }
      };
      img.onerror = () => callback(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  // Pre-bake L-shaped header/sidebar glass blur once per theme/dimming change to avoid per-frame GPU backdrop readback
  function syncPrebakedGlass(wpUrl, overlayRgb, overlayAlpha, tintBg, blurStr) {
    const shell = document.querySelector('.agy-shell');
    if (!wpUrl) {
      if (shell) shell.style.removeProperty('--agy-l-glass-bg');
      return;
    }
    const key = `${wpUrl.slice(0, 64)}|${wpUrl.length}|${overlayRgb}|${overlayAlpha.toFixed(3)}|${tintBg}|${blurStr}`;
    window.__AGY_BLUR_CACHE__ = window.__AGY_BLUR_CACHE__ || {};
    const cached = window.__AGY_BLUR_CACHE__[key];
    if (cached) {
      if (shell) shell.style.setProperty('--agy-l-glass-bg', 'url("' + cached + '")');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const w = 640;
        const h = Math.max(180, Math.round((img.naturalHeight || 1440) * (w / (img.naturalWidth || 2560))));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pxMatch = String(blurStr !== undefined ? blurStr : '3px').match(/(\d+(?:\.\d+)?)/);
        const scaledBlur = Math.max(0, Math.min(16, Math.round((pxMatch ? parseFloat(pxMatch[1]) : 3) * 0.75)));
        ctx.filter = scaledBlur > 0 ? `blur(${scaledBlur}px)` : 'none';
        ctx.drawImage(img, -12, -12, w + 24, h + 24);
        ctx.filter = 'none';
        ctx.fillStyle = `rgba(${overlayRgb}, ${Math.max(overlayAlpha, 0.45)})`;
        ctx.fillRect(0, 0, w, h);
        if (tintBg) {
          ctx.fillStyle = tintBg;
          ctx.fillRect(0, 0, w, h);
        }
        const baked = canvas.toDataURL('image/webp', 0.85);
        window.__AGY_BLUR_CACHE__[key] = baked;
        const curShell = document.querySelector('.agy-shell');
        if (curShell) curShell.style.setProperty('--agy-l-glass-bg', 'url("' + baked + '")');
      } catch (e) {}
    };
    img.src = wpUrl;
  }

  function syncDynamicAuraElement(isDynamic, wpEnabled) {
    const existing = document.getElementById('agy-dynamic-ambient-aura');
    if (!isDynamic || !wpEnabled) {
      if (existing) existing.remove();
      return;
    }
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;
    if (!existing) {
      const aura = document.createElement('span');
      aura.id = 'agy-dynamic-ambient-aura';
      aura.setAttribute('aria-hidden', 'true');
      shell.appendChild(aura);
    } else if (existing.parentElement !== shell) {
      shell.appendChild(existing);
    }
  }

  function applyTheme(overrides = {}) {
    const st = { ...getState(), ...overrides };
    st.themeMode = st.themeMode === 'static' ? 'static' : 'dynamic';
    try {
      localStorage.setItem(STORAGE_THEME, st.themeName);
      localStorage.setItem(STORAGE_BUBBLE, st.bubbleName);
      localStorage.setItem(STORAGE_INPUT, st.inputStyle);
      localStorage.setItem(STORAGE_DIMMING, String(st.dimming));
      localStorage.setItem(STORAGE_WP_ENABLED, String(st.wpEnabled));
      localStorage.setItem(STORAGE_THEME_MODE, st.themeMode);
      if (overrides.customWp !== undefined) {
        localStorage.setItem(STORAGE_CUSTOM_WP, overrides.customWp);
      }
      if (overrides.userAvatar !== undefined) {
        localStorage.setItem(STORAGE_USER_AVATAR, overrides.userAvatar);
      }
      if (overrides.agentAvatar !== undefined) {
        localStorage.setItem(STORAGE_AGENT_AVATAR, overrides.agentAvatar);
      }
      if (overrides.glassBlur !== undefined) {
        localStorage.setItem(STORAGE_GLASS_BLUR, String(overrides.glassBlur));
      }
      if (overrides.avatarSize !== undefined) {
        localStorage.setItem(STORAGE_AVATAR_SIZE, String(overrides.avatarSize));
      }
      if (overrides.avatarRadius !== undefined) {
        localStorage.setItem(STORAGE_AVATAR_RADIUS, String(overrides.avatarRadius));
      }
    } catch (e) {}

    if (window.agySaveThemeConfig) {
      try {
        window.agySaveThemeConfig(JSON.stringify(st));
      } catch (e) {}
    }

    const mainTheme = THEMES[st.themeName] || THEMES[getDefaultThemeKey()] || {};
    const bubbleTheme = THEMES[st.bubbleName] || mainTheme;
    const wpUrl = st.customWp || mainTheme.wallpaper || '';

    const oldLegacy = document.getElementById('antigravity-ho-ly-chibi-theme');
    if (oldLegacy) oldLegacy.remove();

    let styleEl = document.getElementById('antigravity-custom-theme-active');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'antigravity-custom-theme-active';
      document.head.appendChild(styleEl);
    }

    const overlayAlpha = mainTheme.clearBackdrop
      ? Math.min(0.92, Math.max(0.0, ((st.dimming - 10) / 82) * 0.85))
      : Math.min(0.92, Math.max(0.12, (st.dimming / 100) * 0.78));
    const overlayRgb = mainTheme.overlayRgb || '10, 7, 6';
    const bgPosition = mainTheme.bgPosition || 'center center';
    const secondaryGlowStop = mainTheme.secondaryGlow
      ? `, radial-gradient(circle at 22% 72%, ${mainTheme.secondaryGlow} 0%, transparent 55%)`
      : '';

    let bgLayers = '';
    if (wpUrl) {
      bgLayers = mainTheme.clearBackdrop
        ? `linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%), url("${wpUrl}")`
        : `radial-gradient(circle at 75% 40%, ${mainTheme.glow} 0%, transparent 65%)${secondaryGlowStop}, linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha * 0.85}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%), url("${wpUrl}")`;
    } else {
      bgLayers = mainTheme.pureBg || `radial-gradient(circle at 75% 30%, ${mainTheme.glow} 0%, transparent 60%), linear-gradient(160deg, rgba(${overlayRgb}, 0.96) 0%, #070910 100%)`;
    }

    const wpCss = st.wpEnabled ? `
      .agy-shell {
        background-image: ${bgLayers} !important;
        background-size: cover !important;
        background-position: ${bgPosition} !important;
        background-repeat: no-repeat !important;
        image-rendering: auto !important;
      }
      /* Keep transparent scrollers on GPU composited-scrolling layers */
      .agy-shell .overflow-y-auto {
        will-change: scroll-position;
      }
      .agy-sheet,
      .agy-inset-shell,
      .browser-hole-opaque,
      [data-main-content-body="true"],
      [data-side-panel-body="true"],
      [class*="agy-inset-shell"],
      [class*="--shell-canvas"],
      .agy-shell div.absolute.bottom-0.pointer-events-none,
      .agy-shell [class*="z-50"] .pointer-events-none.right-full,
      .agy-shell .bg-background:not(.settings-modal-container):not(.settings-modal-container *):not(#agy-custom-theme-modal-backdrop *) {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      /* Browser split-pane hole cutout: keep wallpaper & L-glass visible outside [data-browser-hole] without covering live BrowserView */
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"]::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image: ${bgLayers};
        background-size: cover;
        background-position: ${bgPosition};
        background-repeat: no-repeat;
        clip-path: var(--agy-hole-clip, none);
        will-change: transform;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] > :not([data-has-browser-hole="true"]):not([data-browser-hole]:not([data-browser-hole="false"])):not(.settings-modal-container),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] .browser-hole-opaque:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-pane-id]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-tiling-pane]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-main-content-header]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-side-panel-strip]:not([data-has-browser-hole="true"]) {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] :is([data-main-content-body], [data-side-panel-body]):not([data-has-browser-hole="true"]) {
        box-shadow: none !important;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-split-sash] {
        background: rgba(56, 189, 248, 0.14) !important;
        background-image: none !important;
      }
    ` : `
      .agy-shell {
        background: #111113 !important;
      }
    `;

    const defaultCornerSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 20 L2 6 Q2 2 6 2 L20 2' stroke='%23fbbf24' stroke-width='1.5' fill='none' opacity='0.65'/%3E%3Ccircle cx='6' cy='6' r='2' fill='%23fbbf24' opacity='0.75'/%3E%3C/svg%3E";
    const cornerFiligreeUrl = bubbleTheme.cornerSvg || defaultCornerSvg;

    const bubbleStickerCss = bubbleTheme.sticker ? (bubbleTheme.isOrnament ? `
      .group\\/user-input-step {
        padding-top: 18px !important;
      }
      .agy-user-bubble-frame::before {
        content: "";
        position: absolute;
        top: ${bubbleTheme.stickerTop}px;
        right: ${bubbleTheme.stickerRight}px;
        width: ${bubbleTheme.stickerW}px;
        height: ${bubbleTheme.stickerH}px;
        background-image: url("${bubbleTheme.sticker}");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none;
        ${st.themeMode === 'dynamic' ? 'transition: transform 0.2s ease;' : 'transition: none;'}
      }
    ` : `
      .group\\/user-input-step {
        padding-top: ${Math.max(36, Math.abs(bubbleTheme.stickerTop) + 8)}px !important;
      }
      .agy-user-bubble-frame::before {
        content: "";
        position: absolute;
        top: ${bubbleTheme.stickerTop}px;
        right: ${bubbleTheme.stickerRight}px;
        width: ${bubbleTheme.stickerW}px;
        height: ${bubbleTheme.stickerH}px;
        background-image: url("${bubbleTheme.sticker}");
        background-size: contain;
        background-position: bottom center;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none;
        ${st.themeMode === 'dynamic' ? 'transition: transform 0.2s ease;' : 'transition: none;'}
      }
    `) : `
      .agy-user-bubble-frame::before { display: none !important; }
    `;

    const showInputSticker = st.inputStyle !== 'minimal' && bubbleTheme.sticker;
    const inputStickerCss = showInputSticker ? (bubbleTheme.isOrnament ? `
      .surface-composer {
        margin-top: 16px !important;
        overflow: visible !important;
      }
      .surface-composer::before {
        content: "";
        position: absolute;
        top: ${bubbleTheme.stickerTop}px;
        right: 16px;
        width: ${bubbleTheme.stickerW + 8}px;
        height: ${bubbleTheme.stickerH + 2}px;
        background-image: url("${bubbleTheme.sticker}");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 30;
        pointer-events: none;
      }
      .surface-composer::after {
        content: "";
        position: absolute;
        bottom: 3px;
        left: 4px;
        width: 16px;
        height: 16px;
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        transform: rotate(180deg);
        z-index: 25;
        pointer-events: none;
        opacity: 0.78;
      }
    ` : `
      .surface-composer {
        margin-top: 28px !important;
        overflow: visible !important;
      }
      .surface-composer::before {
        content: "";
        position: absolute;
        top: ${bubbleTheme.stickerTop - 4}px;
        right: 16px;
        width: ${bubbleTheme.stickerW + 6}px;
        height: ${bubbleTheme.stickerH + 6}px;
        background-image: url("${bubbleTheme.sticker}");
        background-size: contain;
        background-position: bottom center;
        background-repeat: no-repeat;
        z-index: 30;
        pointer-events: none;
      }
      .surface-composer::after { display: none !important; }
    `) : `
      .surface-composer::before,
      .surface-composer::after { display: none !important; }
    `;

    const inputCardBg =
      st.inputStyle === 'glass'
        ? (bubbleTheme.inputGlassBg || 'rgba(20, 15, 13, 0.52)')
        : st.inputStyle === 'double_gold'
        ? 'linear-gradient(145deg, rgba(44, 28, 20, 0.90) 0%, rgba(24, 15, 12, 0.92) 100%)'
        : (bubbleTheme.inputCardBg || 'rgba(28, 19, 16, 0.88)');

    const inputOuterBorder =
      st.inputStyle === 'double_gold'
        ? 'linear-gradient(135deg, #f59e0b 0%, rgba(217, 119, 6, 0.35) 50%, #fbbf24 100%)'
        : bubbleTheme.frameBg;

    const sidebarBg = mainTheme.sidebarBg || 'rgba(14, 10, 8, 0.68)';
    const sidebarHoverBg = mainTheme.sidebarHoverBg || 'rgba(255, 255, 255, 0.08)';
    const btnBg = mainTheme.btnBg || 'rgba(48, 30, 22, 0.62)';
    const modalBg = mainTheme.modalBg || 'rgba(14, 12, 12, 0.96)';
    const innerBubbleBorder = bubbleTheme.isScroll
      ? '2px solid #78350f'
      : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.06)');

    const isLight = Boolean(mainTheme.isLight);
    const uiInk = mainTheme.uiTextColor || (isLight ? '#0f172a' : 'rgba(248, 250, 252, 0.98)');
    const uiMutedInk = mainTheme.uiMutedColor || (isLight ? '#334155' : 'rgba(226, 232, 240, 0.94)');
    const uiShadow = isLight
      ? '0 1px 2px rgba(255, 255, 255, 0.92), 0 0 6px rgba(255, 255, 255, 0.72)'
      : '0 1px 4px rgba(0, 0, 0, 0.94), 0 0 8px rgba(0, 0, 0, 0.72)';
    const pillBg = mainTheme.pillBg || (isLight ? 'rgba(255, 255, 255, 0.86)' : 'rgba(6, 11, 24, 0.82)');
    const pillHoverBg = mainTheme.pillHoverBg || (isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(10, 18, 38, 0.94)');
    const pillText = mainTheme.pillTextColor || (isLight ? '#0f172a' : '#f8fafc');
    const pillBorder = mainTheme.pillBorder || (isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.2)');
    const preCodeBg = isLight ? `rgba(${overlayRgb}, 0.72)` : `rgba(${overlayRgb}, 0.56)`;

    const effectiveUserAvatar = st.userAvatar === 'none' ? '' : (st.userAvatar || mainTheme.userAvatar || '');
    const effectiveAgentAvatar = st.agentAvatar === 'none' ? '' : (st.agentAvatar || mainTheme.agentAvatar || '');
    const avSize = Math.min(52, Math.max(22, Number(st.avatarSize) || 32));
    const avAgentSize = Math.max(22, avSize - 2);
    const avRadius = Math.min(50, Math.max(0, Number.isFinite(Number(st.avatarRadius)) ? Number(st.avatarRadius) : 50));

    const avatarCss = `
      ${effectiveUserAvatar ? `
      .agy-shell [data-testid="user-message"] {
        position: relative !important;
        padding-right: ${avSize + 10}px !important;
      }
      .agy-shell [data-testid="user-message"]::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 6px;
        width: ${avSize}px;
        height: ${avSize}px;
        border-radius: ${avRadius}%;
        background-image: url("${effectiveUserAvatar}");
        background-size: cover;
        background-position: center;
        border: 1.5px solid ${mainTheme.primary};
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), 0 0 8px ${mainTheme.glow};
        pointer-events: none;
      }
      ` : ''}
      ${effectiveAgentAvatar ? `
      .agy-shell [data-testid="agent-response"] {
        position: relative !important;
        padding-left: ${avAgentSize + 22}px !important;
        min-height: ${avAgentSize + 20}px !important;
      }
      .agy-shell [data-testid="agent-response"]::before {
        content: "";
        position: absolute;
        top: 12px;
        left: 12px;
        width: ${avAgentSize}px;
        height: ${avAgentSize}px;
        border-radius: ${avRadius}%;
        background-image: url("${effectiveAgentAvatar}");
        background-size: cover;
        background-position: center;
        border: 1.5px solid ${mainTheme.secondary || mainTheme.primary};
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), 0 0 8px ${mainTheme.secondaryGlow || mainTheme.glow};
        pointer-events: none;
      }
      ` : ''}
    `;

    const sidebarEnhanceCss = (mainTheme.sidebarEnhanceText || isLight) ? `
      .agy-shell :is(aside, [data-sidebar="true"], .bg-sidebar) :is(a, span, button, div) {
        color: ${uiInk};
        text-shadow: ${isLight ? '0 1px 2px rgba(255, 255, 255, 0.9)' : '0 1px 3px rgba(0, 0, 0, 0.96), 0 0 8px rgba(0, 0, 0, 0.78)'};
      }
      .agy-shell :is(aside, [data-sidebar="true"], .bg-sidebar) :is(.text-muted-foreground, .text-secondary-foreground, .opacity-60) {
        color: ${uiMutedInk} !important;
        opacity: 0.92 !important;
      }
    ` : '';

    const aiCardCss = mainTheme.aiCardBg ? `
      /* Translucent reading card for AI responses (zero live backdrop-filter for max 120fps scroll) */
      .agy-shell [data-main-content-body="true"] {
        color: ${uiInk} !important;
        text-shadow: ${isLight ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.92), 0 0 10px rgba(0, 0, 0, 0.72)'};
      }
      .agy-shell [data-testid="agent-response"],
      .agy-shell .agy-user-bubble,
      .agy-shell .surface-composer-card {
        text-shadow: none !important;
      }
      .agy-shell [data-testid="agent-response"] {
        background: ${mainTheme.aiCardBg} !important;
        color: ${uiInk} !important;
        backdrop-filter: none !important;
        border: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)')} !important;
        border-radius: 14px !important;
        padding: 12px 16px !important;
        box-shadow: ${isLight ? '0 4px 14px rgba(15, 23, 42, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.28)'} !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      .agy-shell [data-testid="agent-response"] :is(p, li, ul, ol, h1, h2, h3, h4, h5, h6, strong, b, em, td, th, blockquote) {
        color: ${uiInk} !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.text-muted-foreground, .text-secondary-foreground),
      .agy-shell [data-testid="agent-response"] button:not(.bg-primary) {
        color: ${uiMutedInk} !important;
      }
      .agy-shell [data-testid="agent-response"] :is(a, .text-link),
      .agy-shell [data-testid="agent-response"] button.inline-flex.items-baseline {
        color: #7dd3fc !important;
      }
      .agy-shell [data-testid="agent-response"] pre {
        background: rgba(4, 8, 16, 0.90) !important;
        color: #f8fafc !important;
        border: 1px solid rgba(148, 163, 184, 0.24) !important;
        border-radius: 10px !important;
      }
      .agy-shell [data-testid="agent-response"] :not(pre) > code {
        background: rgba(15, 23, 42, 0.86) !important;
        color: #f1f5f9 !important;
        border: 1px solid rgba(148, 163, 184, 0.26) !important;
        border-radius: 5px !important;
        padding: 1px 5px !important;
      }
      .agy-shell [data-testid="agent-response"] .md-table-bleed,
      .agy-shell [data-testid="agent-response"] .md-table-host {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-inline: 0 !important;
        left: auto !important;
        right: auto !important;
        transform: none !important;
        box-sizing: border-box !important;
      }
      .agy-shell [data-testid="agent-response"] .md-table-scroll,
      .agy-shell [data-testid="agent-response"] :has(> table):not(.md-table-frame) {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        padding-bottom: 2px !important;
        box-sizing: border-box !important;
        /* Keep standard scrollbar-width: auto so Chromium does not disable ::-webkit-scrollbar */
        scrollbar-width: auto !important;
        scrollbar-color: auto !important;
      }
      .agy-shell [data-testid="agent-response"] .md-table-frame {
        /* .md-table-frame sits INSIDE .md-table-scroll; forcing width:100% + overflow:hidden hid overflow from .md-table-scroll */
        width: fit-content !important;
        min-width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        transform: none !important;
        box-sizing: border-box !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.md-math-display, .katex-display) {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding-bottom: 4px !important;
        box-sizing: border-box !important;
        scrollbar-width: auto !important;
        scrollbar-color: auto !important;
      }
      .agy-shell [data-testid="agent-response"] :not(.md-math-display):not(.katex-display) > .katex {
        display: inline-block !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
        scrollbar-width: auto !important;
        scrollbar-color: auto !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.md-table-scroll, :has(> table):not(.md-table-frame), .md-math-display, .katex-display, :not(.md-math-display):not(.katex-display) > .katex)::-webkit-scrollbar {
        height: 8px !important;
        display: block !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.md-table-scroll, :has(> table):not(.md-table-frame), .md-math-display, .katex-display, :not(.md-math-display):not(.katex-display) > .katex)::-webkit-scrollbar-track {
        background: ${isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)'} !important;
        border-radius: 9999px !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.md-table-scroll, :has(> table):not(.md-table-frame), .md-math-display, .katex-display, :not(.md-math-display):not(.katex-display) > .katex)::-webkit-scrollbar-thumb {
        background: ${isLight ? 'rgba(15, 23, 42, 0.34)' : 'rgba(148, 163, 184, 0.48)'} !important;
        border-radius: 9999px !important;
      }
      .agy-shell [data-testid="agent-response"] :is(.md-table-scroll, :has(> table):not(.md-table-frame), .md-math-display, .katex-display, :not(.md-math-display):not(.katex-display) > .katex)::-webkit-scrollbar-thumb:hover {
        background: ${isLight ? 'rgba(15, 23, 42, 0.54)' : 'rgba(148, 163, 184, 0.72)'} !important;
      }
      .agy-shell [data-testid="agent-response"] table {
        width: 100% !important;
        min-width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        table-layout: auto !important;
        box-sizing: border-box !important;
      }
      .agy-shell [data-testid="agent-response"] :is(th, td) {
        max-width: none !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        padding: 8px 12px !important;
      }
      .agy-shell [data-testid="agent-response"] :is(td, th) .inline-pill-wrap {
        min-width: 0 !important;
      }
      ${isLight ? `
      .agy-shell [data-main-content-body="true"],
      .agy-shell [data-testid="agent-response"] :is(p, li, span, code, h1, h2, h3, h4, strong, td, th) {
        color: ${uiInk};
      }
      ` : ''}
      .agy-shell [data-main-content-body="true"] h1,
      .agy-shell [data-main-content-body="true"] h2 {
        text-shadow: ${isLight ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.85)'};
      }
    ` : '';

    const useUnifiedGlass = Boolean(st.wpEnabled && wpUrl && mainTheme.unifiedGlass);
    if (useUnifiedGlass && typeof syncShellMetrics === 'function') {
      syncShellMetrics();
    }
    if (useUnifiedGlass) {
      const effectiveBlur = Number.isFinite(st.glassBlur) ? `${st.glassBlur}px` : (mainTheme.headerBlur || '3px');
      syncPrebakedGlass(wpUrl, overlayRgb, overlayAlpha, mainTheme.headerBg || '', effectiveBlur);
    } else {
      syncPrebakedGlass(null);
    }

    const sidePanelCss = st.wpEnabled ? `
      /* Frosted pre-baked glass + dark/light reading scrim for right-side Artifact / Text / Diff split panels */
      ${useUnifiedGlass ? `
      .agy-shell[data-agy-side-glass="1"]::before {
        clip-path: polygon(
          evenodd,
          0 0,
          100% 0,
          100% var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) 100%,
          0 100%,
          0 0,
          var(--agy-side-l, 100%) var(--agy-side-t, 75px),
          var(--agy-side-r, 100%) var(--agy-side-t, 75px),
          var(--agy-side-r, 100%) var(--agy-side-b, 100%),
          var(--agy-side-l, 100%) var(--agy-side-b, 100%),
          var(--agy-side-l, 100%) var(--agy-side-t, 75px)
        ) !important;
      }
      ` : ''}
      body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"]:not([data-has-browser-hole="true"]):not(:has([data-browser-hole]:not([data-browser-hole="false"]))) {
        background: ${mainTheme.aiCardBg || `rgba(${overlayRgb}, 0.72)`} !important;
        ${isLight ? `color: ${uiInk} !important;` : ''}
        backdrop-filter: none !important;
        border-left: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)')} !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
      }
      body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"]:not([data-has-browser-hole="true"]):not(:has([data-browser-hole]:not([data-browser-hole="false"]))) pre {
        background: ${preCodeBg} !important;
        border: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)')} !important;
        border-radius: 10px !important;
      }
      .agy-shell [data-side-panel-body="true"] :is(h1, h2, h3, h4) {
        ${isLight ? `color: ${uiInk} !important;` : ''}
        text-shadow: ${isLight ? 'none' : '0 1px 6px rgba(0, 0, 0, 0.85)'};
      }
    ` : '';

    const headerCss = mainTheme.headerBg ? `
      /* Frosted top titlebar & seamless L-shaped unified glass (zero live backdrop-filter) */
      ${useUnifiedGlass ? `
      .agy-shell {
        position: relative !important;
      }
      .agy-shell > div:first-of-type {
        position: relative !important;
        z-index: 3 !important;
      }
      .agy-shell > div:not(:first-of-type) {
        position: relative !important;
        z-index: 2 !important;
      }
      .agy-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background-color: ${mainTheme.headerBg};
        background-image: var(--agy-l-glass-bg, none);
        background-size: cover;
        background-position: ${bgPosition};
        background-repeat: no-repeat;
        backdrop-filter: none !important;
        will-change: transform;
        clip-path: polygon(
          0 0,
          100% 0,
          100% var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) 100%,
          0 100%
        );
      }
      .agy-shell [class*="@container/titlebar"] {
        background: transparent !important;
        backdrop-filter: none !important;
        border-bottom: 1px solid ${mainTheme.headerBorder || 'rgba(56, 189, 248, 0.10)'} !important;
      }
      ` : `
      .agy-shell [class*="@container/titlebar"] {
        background: ${mainTheme.headerBg} !important;
        backdrop-filter: none !important;
        border-bottom: 1px solid ${mainTheme.headerBorder || 'rgba(56, 189, 248, 0.15)'} !important;
      }
      `}
      .agy-shell [class*="@container/titlebar"] :is(button, span, a):not(#agy-custom-theme-badge),
      .agy-shell [class*="@container/titlebar"] [data-testid="breadcrumb-segment"] {
        color: ${uiInk} !important;
        text-shadow: ${uiShadow} !important;
      }
      .agy-shell [class*="@container/titlebar"] [data-testid="pane-titlebar-toolbar"] button.border {
        background: ${isLight ? 'rgba(255, 255, 255, 0.56)' : 'rgba(6, 11, 24, 0.36)'} !important;
        border-color: ${pillBorder} !important;
      }
    ` : '';

    const sidebarOuterCss = useUnifiedGlass ? `
      .agy-shell aside,
      .agy-shell [data-sidebar="true"],
      .agy-shell .bg-sidebar:not(.surface-opaque) {
        background: transparent !important;
        backdrop-filter: none !important;
      }
    ` : `
      .agy-shell aside,
      .agy-shell [data-sidebar="true"],
      .agy-shell .bg-sidebar:not(.surface-opaque) {
        background: ${sidebarBg} !important;
        backdrop-filter: none !important;
      }
    `;

    styleEl.textContent = `
      ${wpCss}

      /* Translucent themed glass sidebar (unified via ::before when unifiedGlass is active) */
      ${sidebarOuterCss}
      .agy-shell .bg-sidebar:not(.surface-opaque) .bg-sidebar:not(.surface-opaque),
      .agy-shell [data-sidebar="true"] .bg-sidebar:not(.surface-opaque),
      .agy-shell .bg-sidebar:not(.surface-opaque) [class*="group/headerbtn"],
      .agy-shell .bg-sidebar:not(.surface-opaque) [class*="group/section-header"] {
        background: transparent !important;
        backdrop-filter: none !important;
      }
      /* Keep floating menubar dropdowns & opaque popovers readable (never inherit transparent sidebar bg) */
      .agy-shell .surface-opaque.bg-sidebar,
      .agy-shell .surface-opaque.border-menu-border {
        background: ${modalBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        box-shadow: 0 12px 32px rgba(0, 0, 0, ${isLight ? '0.18' : '0.65'}) !important;
        backdrop-filter: none !important;
      }
      /* Preserve virtual list positioning; hide sticky headers only while scrolled */
      .agy-shell .bg-sidebar .agy-scrolled > .w-full.relative > .bg-sidebar[style*="position: sticky"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.14s ease !important;
      }
      .agy-shell .bg-sidebar [class*="group/headerbtn"]:hover,
      .agy-shell .bg-sidebar a:hover {
        background: ${sidebarHoverBg} !important;
      }
      ${sidebarEnhanceCss}
      ${aiCardCss}
      ${sidePanelCss}
      ${avatarCss}
      ${headerCss}

      /* "+ New Conversation" button glow */
      .agy-button-custom.border.border-border {
        background: ${btnBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3) !important;
      }

      /* User Chat Bubble Double-Border Frame & Ornament */
      .agy-user-bubble-frame {
        background: ${bubbleTheme.frameBg} !important;
        border-radius: ${bubbleTheme.isScroll ? '6px' : '14px'} !important;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${bubbleTheme.glow} !important;
        position: relative !important;
        overflow: visible !important;
        padding: 1.2px !important;
      }

      .agy-user-bubble-frame::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: ${bubbleTheme.isOrnament ? '16px' : '14px'};
        height: ${bubbleTheme.isOrnament ? '16px' : '14px'};
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none;
        opacity: ${bubbleTheme.isOrnament ? '0.85' : '0.65'};
      }

      .agy-user-bubble {
        background: ${bubbleTheme.bg} !important;
        border-radius: ${bubbleTheme.isScroll ? '5px' : '13px'} !important;
        padding: 8px 16px !important;
        color: ${bubbleTheme.textColor} !important;
        border: ${innerBubbleBorder} !important;
        overflow: visible !important;
        font-weight: 450 !important;
      }

      .agy-user-bubble * {
        color: ${bubbleTheme.textColor} !important;
      }

      /* Double-Border Input Composer */
      .surface-composer {
        background: ${inputOuterBorder} !important;
        border-radius: 16px !important;
        padding: 1.5px !important;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${bubbleTheme.glow} !important;
        position: relative !important;
      }

      .surface-composer-card {
        background: ${inputCardBg} !important;
        backdrop-filter: none !important;
        border-radius: 14.5px !important;
        border: ${bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.07)'} !important;
      }
      .surface-composer-card :is(textarea, [contenteditable="true"], [contenteditable="true"] p, [contenteditable="true"] span) {
        color: #f8fafc !important;
      }

      /* High-contrast pill badges for top composer bar (adaptive light/dark theme) */
      .surface-composer [data-testid="project-selector-trigger"],
      .surface-composer [data-testid="branch-pill-trigger"],
      .surface-composer [aria-label="Select Environment"],
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"] {
        background: ${pillBg} !important;
        color: ${pillText} !important;
        border: 1px solid ${pillBorder} !important;
        border-radius: 9999px !important;
        font-weight: 500 !important;
        box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25) !important;
        margin: 1px 2px !important;
        transition: background-color 0.15s ease, border-color 0.15s ease !important;
      }
      .surface-composer [data-testid="branch-pill-trigger"],
      .surface-composer [aria-label="Select Environment"],
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button:not([data-testid="project-selector-trigger"]),
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"]:not([data-testid="project-selector-trigger"]) {
        padding-left: 8px !important;
        padding-right: 7px !important;
        gap: 4px !important;
      }
      .surface-composer [data-testid="project-selector-trigger"]:hover,
      .surface-composer [data-testid="branch-pill-trigger"]:hover,
      .surface-composer [aria-label="Select Environment"]:hover,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button:hover,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"]:hover {
        background: ${pillHoverBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        color: ${pillText} !important;
      }
      .surface-composer [data-testid="project-selector-trigger"] *,
      .surface-composer [data-testid="branch-pill-trigger"] *,
      .surface-composer [aria-label="Select Environment"] *,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button *,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"] * {
        color: ${pillText} !important;
      }
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] .ml-auto > * {
        background: ${pillBg} !important;
        color: ${pillText} !important;
        border-radius: 9999px !important;
        padding: 2px 8px !important;
      }

      ${bubbleStickerCss}
      ${inputStickerCss}

      @media (max-width: 640px) {
        .agy-user-bubble-frame::before,
        .surface-composer::before {
          transform: scale(0.78);
          transform-origin: bottom right;
        }
      }

      .settings-modal-container {
        background: ${modalBg} !important;
        border: 1px solid ${mainTheme.borderColor} !important;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.75), 0 0 24px ${mainTheme.glow} !important;
        backdrop-filter: none !important;
      }

      #agy-custom-theme-modal-dialog {
        background: ${modalBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), 0 0 32px ${mainTheme.glow} !important;
      }
      #agy-custom-theme-modal-header {
        background: ${mainTheme.modalHeaderBg || 'rgba(22, 16, 14, 0.85)'} !important;
      }
      #agy-custom-theme-badge {
        color: ${mainTheme.primary} !important;
        border-color: ${mainTheme.borderColor} !important;
        background: ${mainTheme.glow} !important;
      }
      #agy-custom-theme-sidebar-btn svg {
        color: ${mainTheme.primary} !important;
      }
      ${st.themeMode === 'dynamic' ? `
      @keyframes agyAmbientAura {
        0%, 100% {
          opacity: 0.42;
          transform: translate3d(0, 0, 0) scale(1);
        }
        50% {
          opacity: 0.72;
          transform: translate3d(-1.5%, 1%, 0) scale(1.04);
        }
      }
      @keyframes agyBorderFlow {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }
      @keyframes agyOrnamentFloat {
        0%, 100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -3px, 0);
        }
      }
      @keyframes agyFiligreeShimmer {
        0%, 100% {
          opacity: 0.58;
        }
        50% {
          opacity: 0.96;
        }
      }
      @keyframes agyStudioBreath {
        0%, 100% {
          opacity: 0.32;
          transform: scale(0.95);
        }
        50% {
          opacity: 0.88;
          transform: scale(1.06);
        }
      }
      #agy-dynamic-ambient-aura {
        display: block;
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image: radial-gradient(circle at 76% 32%, ${mainTheme.glow} 0%, transparent 56%), radial-gradient(circle at 22% 76%, ${mainTheme.secondaryGlow || mainTheme.glow} 0%, transparent 52%);
        will-change: opacity, transform;
        animation: agyAmbientAura 10s ease-in-out infinite;
      }
      .agy-user-bubble-frame,
      .surface-composer {
        background-size: 220% 220% !important;
        animation: agyBorderFlow 7s ease-in-out infinite !important;
      }
      .agy-user-bubble-frame::before,
      .surface-composer::before {
        will-change: transform;
        animation: agyOrnamentFloat 4.5s ease-in-out infinite;
      }
      .agy-user-bubble-frame::after,
      .surface-composer::after {
        animation: agyFiligreeShimmer 3.8s ease-in-out infinite;
      }
      #agy-custom-theme-topbar-btn {
        position: relative;
      }
      #agy-custom-theme-topbar-btn::after {
        content: "";
        position: absolute;
        inset: -3px;
        border-radius: inherit;
        pointer-events: none;
        background: radial-gradient(circle, ${mainTheme.glow} 0%, transparent 72%);
        will-change: opacity, transform;
        animation: agyStudioBreath 3.2s ease-in-out infinite;
      }
      ` : `
      #agy-dynamic-ambient-aura {
        display: none !important;
      }
      .agy-user-bubble-frame,
      .surface-composer,
      .agy-user-bubble-frame::before,
      .surface-composer::before,
      .agy-user-bubble-frame::after,
      .surface-composer::after,
      #agy-custom-theme-topbar-btn,
      #agy-custom-theme-topbar-btn::after {
        animation: none !important;
        transition: none !important;
      }
      `}
    `;

    syncDynamicAuraElement(st.themeMode === 'dynamic', st.wpEnabled);
    syncTitleBarOverlay(st);
    scheduleTitleBarSync(st);
  }

  function syncTitleBarOverlay(stOverride) {
    const st = stOverride || getState();
    const activeTh = THEMES[st.themeName] || THEMES[getDefaultThemeKey()] || {};
    if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
      try {
        window.electronNative.setTitleBarOverlay({
          color: st.wpEnabled ? '#00000000' : '#111114',
          symbolColor: (st.wpEnabled && activeTh.isLight) ? '#0f172a' : '#f8fafc'
        });
      } catch (e) {}
    }
  }

  function clearTitleBarTimers() {
    if (Array.isArray(window.__AGY_TBO_TIMERS__)) {
      window.__AGY_TBO_TIMERS__.forEach(id => clearTimeout(id));
    }
    window.__AGY_TBO_TIMERS__ = [];
  }

  function scheduleTitleBarSync(stOverride) {
    clearTitleBarTimers();
    const st = stOverride || getState();
    syncTitleBarOverlay(st);
    [300, 900, 2000, 4000, 7000].forEach(ms => {
      window.__AGY_TBO_TIMERS__.push(setTimeout(() => syncTitleBarOverlay(), ms));
    });
  }

  function removeCustomTheme() {
    clearTitleBarTimers();
    if (window.__AGY_TOPBAR_WATCHDOG__) {
      clearInterval(window.__AGY_TOPBAR_WATCHDOG__);
      window.__AGY_TOPBAR_WATCHDOG__ = null;
    }
    if (window.__AGY_SCROLL_AC__) {
      try { window.__AGY_SCROLL_AC__.abort(); } catch (e) {}
    }
    const styleEl = document.getElementById('antigravity-custom-theme-active');
    if (styleEl) styleEl.remove();
    const topbarBtn = document.getElementById('agy-custom-theme-topbar-btn');
    if (topbarBtn) topbarBtn.remove();
    const navBtn = document.getElementById('agy-custom-theme-sidebar-btn');
    if (navBtn) navBtn.remove();
    const settingsBtn = document.getElementById('agy-custom-theme-settings-btn');
    if (settingsBtn) settingsBtn.remove();
    const modal = document.getElementById('agy-custom-theme-modal-backdrop');
    if (modal) modal.remove();
    const aura = document.getElementById('agy-dynamic-ambient-aura');
    if (aura) aura.remove();
    const shell = document.querySelector('.agy-shell');
    if (shell) {
      delete shell.dataset.agyHoleActive;
      shell.style.removeProperty('--agy-hole-clip');
      shell.style.removeProperty('--agy-l-glass-bg');
    }
    if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
      try {
        window.electronNative.setTitleBarOverlay({ color: '#111114', symbolColor: '#f8fafc' });
      } catch (e) {}
    }
  }

  window.__ANTIGRAVITY_APPLY_CUSTOM_THEME__ = applyTheme;
  window.__ANTIGRAVITY_REMOVE_CUSTOM_THEME__ = removeCustomTheme;
  window.__ANTIGRAVITY_OPEN_THEME_MODAL__ = openCustomThemeModal;

  applyTheme();

  function syncThemeModeToggleBtn(mode, primaryColor) {
    const btn = document.getElementById('agy-theme-mode-toggle');
    if (!btn) return;
    const isDyn = mode !== 'static';
    const accent = primaryColor || '#38bdf8';
    btn.dataset.themeMode = isDyn ? 'dynamic' : 'static';
    btn.setAttribute('aria-pressed', isDyn ? 'true' : 'false');
    const dynPill = btn.querySelector('[data-mode-pill="dynamic"]');
    const statPill = btn.querySelector('[data-mode-pill="static"]');
    if (dynPill) {
      dynPill.style.background = isDyn ? accent : 'transparent';
      dynPill.style.color = isDyn ? '#090d16' : '#a1a1aa';
      dynPill.style.fontWeight = isDyn ? '700' : '500';
    }
    if (statPill) {
      statPill.style.background = !isDyn ? 'rgba(255, 255, 255, 0.16)' : 'transparent';
      statPill.style.color = !isDyn ? '#f4f4f5' : '#a1a1aa';
      statPill.style.fontWeight = !isDyn ? '700' : '500';
    }
  }

  function openCustomThemeModal(initialFile) {
    let backdrop = document.getElementById('agy-custom-theme-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'agy-custom-theme-modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(10px);
      `;

      backdrop.innerHTML = `
        <div id="agy-custom-theme-modal-dialog" style="background: rgba(16, 12, 11, 0.97); border: 1.2px solid rgba(212, 148, 106, 0.35); border-radius: 18px; width: 100%; max-width: 900px; height: 86vh; max-height: 860px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), 0 0 32px rgba(224, 142, 85, 0.25); font-family: system-ui, -apple-system, sans-serif;">
          <div id="agy-custom-theme-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 26px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(22, 16, 14, 0.85);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px; font-weight: 600; color: #f4f4f5; letter-spacing: -0.2px;">Custom Theme Studio</span>
              <span id="agy-custom-theme-badge" style="font-size: 11.5px; padding: 2.5px 9px; border-radius: 9999px; background: rgba(224, 142, 85, 0.2); color: #e08e55; font-weight: 500; border: 1px solid rgba(224, 142, 85, 0.3);">${THEME_KEYS.length} Preset${THEME_KEYS.length > 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <button id="agy-theme-mode-toggle" type="button" title="Chuyển chế độ Động / Tĩnh (Dynamic / Static)" style="display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 9999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); cursor: pointer; font-size: 12px; line-height: 1; user-select: none;">
                <span data-mode-pill="dynamic" style="padding: 5px 10px; border-radius: 9999px; transition: background-color 0.15s ease, color 0.15s ease;">⚡ Động</span>
                <span data-mode-pill="static" style="padding: 5px 10px; border-radius: 9999px; transition: background-color 0.15s ease, color 0.15s ease;">🧊 Tĩnh</span>
              </button>
              <button id="agy-theme-modal-close-btn" type="button" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); color: #d4d4d8; cursor: pointer; width: 30px; height: 30px; border-radius: 8px; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;">✕</button>
            </div>
          </div>
          <div id="agy-theme-modal-body" style="flex: 1; overflow-y: auto; height: 100%;"></div>
        </div>
      `;

      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.style.display = 'none';
      });
      backdrop.querySelector('#agy-theme-modal-close-btn').addEventListener('click', () => {
        backdrop.style.display = 'none';
      });
      backdrop.querySelector('#agy-theme-mode-toggle').addEventListener('click', () => {
        const cur = getState();
        const nextMode = cur.themeMode === 'static' ? 'dynamic' : 'static';
        applyTheme({ themeMode: nextMode });
        const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
        syncThemeModeToggleBtn(nextMode, th.primary);
      });
      const sig = window.__AGY_SCROLL_AC__ ? window.__AGY_SCROLL_AC__.signal : undefined;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop.style.display !== 'none') {
          backdrop.style.display = 'none';
        }
      }, { signal: sig });
      window.addEventListener('paste', (e) => {
        if (backdrop.style.display === 'none') return;
        const items = (e.clipboardData && e.clipboardData.items) || [];
        for (const it of items) {
          if (it.type.startsWith('image/')) {
            e.preventDefault();
            if (typeof backdrop._handleAiFile === 'function') backdrop._handleAiFile(it.getAsFile());
            return;
          }
        }
      }, { signal: sig });
    }

    backdrop.style.display = 'flex';
    const body = backdrop.querySelector('#agy-theme-modal-body');
    renderThemePanels(body);
    if (initialFile && typeof backdrop._handleAiFile === 'function') {
      backdrop._handleAiFile(initialFile);
    }
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderThemePanels(container, aiStatusHtml = '') {
    const st = getState();
    const defKey = getDefaultThemeKey();
    const mainTheme = THEMES[st.themeName] || THEMES[defKey] || {};
    const effUserAv = st.userAvatar === 'none' ? '' : (st.userAvatar || mainTheme.userAvatar || '');
    const effAgentAv = st.agentAvatar === 'none' ? '' : (st.agentAvatar || mainTheme.agentAvatar || '');
    const hiddenBuiltins = loadHiddenBuiltins();
    const customCount = THEME_KEYS.filter((k) => !BUILTIN_KEYS.has(k)).length;
    const badge = document.getElementById('agy-custom-theme-badge');
    if (badge) badge.textContent = `${THEME_KEYS.length} Preset${THEME_KEYS.length > 1 ? 's' : ''}`;
    syncThemeModeToggleBtn(st.themeMode, mainTheme.primary);

    container.innerHTML = `
      <div id="agy-theme-scroll-container" style="padding: 24px 32px 48px 32px; max-width: 860px; margin: 0 auto; overflow-y: auto; height: 100%; color: #f4f4f5;">
        <div id="agy-studio-ai-drop" tabindex="0" style="border: 1.5px dashed ${mainTheme.primary || '#38bdf8'}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 14px 20px; margin-bottom: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s ease, background-color 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.06); border: 1px solid ${mainTheme.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 18px;">✨</div>
              <div>
                <div style="font-size: 14.5px; font-weight: 600; color: #f4f4f5;">Tạo Theme mới từ Ảnh (AI • agy CLI)</div>
                <div style="font-size: 12px; color: #a1a1aa;">Thả ảnh vào đây, dán (Ctrl+V) hoặc bấm để chọn ảnh — tự thiết kế bảng màu &amp; hoa văn SVG riêng</div>
              </div>
            </div>
            <span style="padding: 5px 12px; border-radius: 8px; background: ${mainTheme.primary || '#38bdf8'}; color: #090d16; font-weight: 600; font-size: 12px; white-space: nowrap;">Chọn ảnh…</span>
            <input id="agy-studio-ai-file" type="file" accept="image/*" style="display: none;" />
          </div>
          <div id="agy-studio-ai-status" style="font-size: 12.5px; color: #e4e4e7; ${aiStatusHtml ? '' : 'display:none;'}">${aiStatusHtml}</div>
        </div>
        <div style="border: 1px solid ${mainTheme.borderColor}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 14.5px; font-weight: 600; color: #f4f4f5; margin-bottom: 2px;">Wallpaper, Pre-Baked Blur & Config</div>
              <div style="font-size: 12.5px; color: #a1a1aa;">Balance artwork clarity, 120fps pre-baked frosted glass blur, or share config JSON.</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #d4d4d8; cursor: pointer;">
                <input id="agy-wp-toggle" type="checkbox" ${st.wpEnabled ? 'checked' : ''} style="accent-color: ${mainTheme.primary}; cursor: pointer;" />
                Backdrop
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #a1a1aa;">
                Dim
                <input id="agy-dim-slider" type="range" min="15" max="92" value="${st.dimming}" style="width: 96px; cursor: pointer; accent-color: #ffffff; height: 5px;" />
                <span id="agy-dim-val" style="min-width: 32px; text-align: right;">${st.dimming}%</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #a1a1aa;">
                Blur
                <input id="agy-blur-slider" type="range" min="0" max="16" value="${st.glassBlur}" style="width: 78px; cursor: pointer; accent-color: ${mainTheme.primary}; height: 5px;" />
                <span id="agy-blur-val" style="min-width: 30px; text-align: right;">${st.glassBlur}px</span>
              </label>
              <label style="padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Custom Image
                <input id="agy-wp-upload" type="file" accept="image/*" style="display: none;" />
              </label>
              <button id="agy-export-btn" type="button" style="padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Export JSON
              </button>
              <button id="agy-import-toggle" type="button" style="padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Import JSON
              </button>
              <button id="agy-reset-btn" type="button" style="padding: 5px 10px; border-radius: 8px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Reset
              </button>
            </div>
          </div>
          <div id="agy-import-box" style="display: none; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
            <textarea id="agy-import-text" rows="3" placeholder='Paste exported theme config JSON here (e.g. {"themeName":"WLOP Cosmic","dimming":45,...})' style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35); color: #f4f4f5; border: 1px solid ${mainTheme.borderColor}; border-radius: 8px; padding: 8px 10px; font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
              <span id="agy-import-msg" style="font-size: 12px; color: #fca5a5;"></span>
              <button id="agy-import-apply" type="button" style="padding: 5px 12px; border-radius: 7px; background: ${mainTheme.primary}; color: #090d16; font-weight: 600; font-size: 12px; border: none; cursor: pointer;">Apply JSON</button>
            </div>
          </div>
        </div>

        <div style="border: 1px solid ${mainTheme.borderColor}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #f4f4f5; margin-bottom: 2px;">Chat Avatars (User & AI Agent)</div>
              <div style="font-size: 12px; color: #a1a1aa;">Profile badges rendered beside chat messages (auto-compressed WebP).</div>
            </div>
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div id="agy-user-av-preview" style="width: 30px; height: 30px; border-radius: ${st.avatarRadius}%; border: 1.5px solid ${mainTheme.primary}; background: rgba(255,255,255,0.06) ${effUserAv ? `url('${effUserAv}') center/cover no-repeat` : ''}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a1a1aa;">${effUserAv ? '' : 'U'}</div>
                <label style="padding: 4px 10px; border-radius: 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                  User
                  <input id="agy-user-av-upload" type="file" accept="image/*" style="display: none;" />
                </label>
                <button id="agy-user-av-clear" type="button" style="padding: 4px 8px; border-radius: 7px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.14); color: #a1a1aa; font-size: 11.5px; cursor: pointer;">Off</button>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div id="agy-agent-av-preview" style="width: 30px; height: 30px; border-radius: ${st.avatarRadius}%; border: 1.5px solid ${mainTheme.secondary || mainTheme.primary}; background: rgba(255,255,255,0.06) ${effAgentAv ? `url('${effAgentAv}') center/cover no-repeat` : ''}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a1a1aa;">${effAgentAv ? '' : 'AI'}</div>
                <label style="padding: 4px 10px; border-radius: 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                  Agent
                  <input id="agy-agent-av-upload" type="file" accept="image/*" style="display: none;" />
                </label>
                <button id="agy-agent-av-clear" type="button" style="padding: 4px 8px; border-radius: 7px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.14); color: #a1a1aa; font-size: 11.5px; cursor: pointer;">Off</button>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.07);">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a1a1aa;">
              Size
              <input id="agy-av-size" type="range" min="22" max="52" value="${st.avatarSize}" style="width: 100px; cursor: pointer; accent-color: ${mainTheme.primary}; height: 5px;" />
              <span id="agy-av-size-val" style="min-width: 34px;">${st.avatarSize}px</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a1a1aa;">
              Corner Radius
              <input id="agy-av-rad" type="range" min="0" max="50" value="${st.avatarRadius}" style="width: 100px; cursor: pointer; accent-color: ${mainTheme.primary}; height: 5px;" />
              <span id="agy-av-rad-val" style="min-width: 34px;">${st.avatarRadius}%</span>
            </label>
          </div>
        </div>

        <div style="margin-bottom: 28px;">
          <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">User Chat Bubble</div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Mix and match bubble frame & ornament independently from the active wallpaper.</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${THEME_KEYS.map(name => {
              const th = THEMES[name];
              const isSelected = name === st.bubbleName;
              const stickerTop = th.isOrnament ? Math.round((th.stickerTop || 0) * 0.85) : Math.round((th.stickerTop || 0) * 0.74);
              const stickerW = Math.round((th.stickerW || 0) * 0.78);
              const stickerH = th.isOrnament ? Math.round((th.stickerH || 0) * 0.8) : Math.round((th.stickerH || 0) * 0.78);
              return `
                <div class="agy-bubble-card" data-name="${name}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSelected ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 24px 18px 14px 18px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 112px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                  <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 6px; margin-bottom: 10px;">
                    <div style="position: relative; width: 192px; height: 46px; padding: 1.2px; border-radius: ${th.isScroll ? '6px' : '12px'}; background: ${th.frameBg}; box-shadow: 0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${th.glow};">
                      <div style="position: relative; width: 100%; height: 100%; background: ${th.bg}; border: ${th.innerBorder || '1px solid ' + th.borderColor}; border-radius: ${th.isScroll ? '4px' : '11px'}; display: flex; align-items: center; padding: 0 16px;">
                        ${th.sticker ? `<div style="position: absolute; top: ${stickerTop}px; right: 8px; width: ${stickerW}px; height: ${stickerH}px; background-image: url('${th.sticker}'); background-size: contain; background-position: ${th.isOrnament ? 'center' : 'bottom center'}; background-repeat: no-repeat; pointer-events: none;"></div>` : ''}
                        <span style="font-size: 13.5px; font-weight: 500; color: ${th.textColor};">Hello ✨</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13.5px; font-weight: 500; color: #e4e4e7;">${name}</span>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-bottom: 28px;">
          <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">Composer Style</div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Customize the chat input frame without affecting keyboard shortcuts or attachments.</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${Object.entries(INPUT_STYLES).map(([key, item]) => {
              const isSelected = key === st.inputStyle;
              const activeBubbleTh = THEMES[st.bubbleName] || mainTheme;
              const previewStickerStyle = activeBubbleTh.isOrnament
                ? 'top: -12px; right: 10px; width: 72px; height: 22px; background-position: center;'
                : 'top: -22px; right: 10px; width: 32px; height: 28px; background-position: bottom center;';
              const previewInnerBg = key === 'glass'
                ? (activeBubbleTh.inputGlassBg || 'rgba(20, 15, 13, 0.45)')
                : (activeBubbleTh.inputCardBg || 'rgba(26, 18, 15, 0.92)');
              return `
                <div class="agy-input-card" data-style="${key}" style="border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSelected ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 16px 18px; cursor: pointer; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                  <div class="agy-input-preview-outer" style="position: relative; margin-top: 8px; padding: 1.5px; border-radius: 10px; background: ${key === 'double_gold' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : activeBubbleTh.frameBg};">
                    <div class="agy-input-preview-sticker" style="position: absolute; ${previewStickerStyle} background-image: url('${activeBubbleTh.sticker || ''}'); background-size: contain; background-repeat: no-repeat; display: ${key !== 'minimal' && activeBubbleTh.sticker ? 'block' : 'none'}; pointer-events: none;"></div>
                    <div class="agy-input-preview-inner" style="background: ${previewInnerBg}; border-radius: 9px; padding: 8px 12px; font-size: 12px; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                      <span>Ask anything, @ to mention...</span>
                      <span class="agy-input-preview-turbo" style="color: ${activeBubbleTh.primary}; font-size: 11px;">Send →</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-size: 13.5px; font-weight: 500; color: #e4e4e7;">${item.label}</div>
                      <div style="font-size: 11.5px; color: #a1a1aa;">${item.desc}</div>
                    </div>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
            <div>
              <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">Theme Presets (${THEME_KEYS.length})</div>
              <div style="font-size: 12.5px; color: #a1a1aa;">Complete backdrop, palette, unified L-glass, and matching ornaments.</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${hiddenBuiltins.length ? `<button id="agy-restore-builtins-btn" type="button" style="padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">↺ Khôi phục preset gốc (${hiddenBuiltins.length})</button>` : ''}
              ${customCount ? `<button id="agy-clear-custom-btn" type="button" style="padding: 5px 10px; border-radius: 8px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-size: 12px; cursor: pointer; white-space: nowrap;">🗑️ Xóa tất cả tự tạo (${customCount})</button>` : ''}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${THEME_KEYS.map(name => {
              const th = THEMES[name];
              const isSelected = name === st.themeName;
              const canDelete = THEME_KEYS.length > 1;
              const isBuiltin = BUILTIN_KEYS.has(name);
              const thumbBg = th.wallpaper
                ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(14,12,12,0.85)), url('${th.wallpaper}')`
                : (th.pureBg || th.bg);
              const thumbOrnamentStyle = th.isOrnament
                ? 'right: 10px; bottom: 8px; width: 76px; height: 24px; background-position: center;'
                : 'right: 12px; bottom: 4px; width: 42px; height: 38px; background-position: bottom center;';
              return `
                <div class="agy-preset-card" data-name="${escHtml(name)}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: rgba(14, 12, 12, 0.82); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: border-color 0.15s ease;">
                  ${canDelete ? `<button class="agy-delete-preset-btn" data-del-preset="${escHtml(name)}" type="button" title="${isBuiltin ? 'Ẩn preset gốc' : 'Xóa preset'}" style="position: absolute; top: 8px; right: 8px; z-index: 3; width: 26px; height: 26px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.22); background: rgba(10, 12, 18, 0.72); color: #fca5a5; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease;">🗑️</button>` : ''}
                  <div style="height: 68px; width: 100%; background-image: ${thumbBg}; background-size: cover; background-position: ${th.bgPosition || 'center'}; position: relative; display: flex; align-items: flex-end; padding: 8px 14px;">
                    ${th.sticker ? `<div style="position: absolute; ${thumbOrnamentStyle} background-image: url('${th.sticker}'); background-size: contain; background-repeat: no-repeat; pointer-events: none;"></div>` : ''}
                    <span style="font-size: 13.5px; font-weight: 600; color: #fff;">${escHtml(name)}</span>
                  </div>
                  <div style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #a1a1aa;">${escHtml(th.concept || '')}</span>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    function updateInputPreviews(bName) {
      const activeTh = THEMES[bName] || THEMES[getDefaultThemeKey()] || {};
      container.querySelectorAll('.agy-input-card').forEach(card => {
        const key = card.dataset.style;
        const outer = card.querySelector('.agy-input-preview-outer');
        if (outer) {
          outer.style.background = key === 'double_gold'
            ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
            : activeTh.frameBg;
        }
        const inner = card.querySelector('.agy-input-preview-inner');
        if (inner) {
          inner.style.background = key === 'glass'
            ? (activeTh.inputGlassBg || 'rgba(20, 15, 13, 0.45)')
            : (activeTh.inputCardBg || 'rgba(26, 18, 15, 0.92)');
        }
        const sticker = card.querySelector('.agy-input-preview-sticker');
        if (sticker) {
          if (key !== 'minimal' && activeTh.sticker) {
            sticker.style.display = 'block';
            sticker.style.backgroundImage = `url('${activeTh.sticker}')`;
            if (activeTh.isOrnament) {
              sticker.style.top = '-12px';
              sticker.style.width = '72px';
              sticker.style.height = '22px';
              sticker.style.backgroundPosition = 'center';
            } else {
              sticker.style.top = '-22px';
              sticker.style.width = '32px';
              sticker.style.height = '28px';
              sticker.style.backgroundPosition = 'bottom center';
            }
          } else {
            sticker.style.display = 'none';
          }
        }
        const turbo = card.querySelector('.agy-input-preview-turbo');
        if (turbo) {
          turbo.style.color = activeTh.primary;
        }
      });
    }

    const aiDrop = container.querySelector('#agy-studio-ai-drop');
    const aiInput = container.querySelector('#agy-studio-ai-file');
    const modalBackdrop = document.getElementById('agy-custom-theme-modal-backdrop');
    const handleAiFile = async (file) => {
      if (!file) return;
      if (modalBackdrop && modalBackdrop._aiTimer) { clearInterval(modalBackdrop._aiTimer); modalBackdrop._aiTimer = null; }
      const started = Date.now();
      let baseMsg = 'Đang chuẩn bị ảnh…';
      const paint = () => {
        const s0 = container.querySelector('#agy-studio-ai-status');
        if (s0) {
          s0.style.display = 'block';
          s0.innerHTML = `⏳ ${escHtml(baseMsg)} (${Math.floor((Date.now() - started) / 1000)}s)`;
        }
      };
      paint();
      if (modalBackdrop) modalBackdrop._aiTimer = setInterval(paint, 1000);
      try {
        const r = await createThemeFromImageFile(file, (m) => { baseMsg = m; paint(); });
        if (modalBackdrop && modalBackdrop._aiTimer) { clearInterval(modalBackdrop._aiTimer); modalBackdrop._aiTimer = null; }
        const sw = (c) => `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${toHex(c)};border:1px solid rgba(255,255,255,0.3);vertical-align:middle;"></span>`;
        const okHtml = `<div style="display:flex;align-items:center;gap:10px;padding-top:6px;"><img src="${r.wallpaper}" style="width:64px;height:40px;object-fit:cover;border-radius:6px;"><div>✅ Đã tạo &amp; áp dụng <b>${escHtml(r.name)}</b> (${r.ai ? 'AI design' : 'Auto palette'}) ${sw(r.pal.primary)} ${sw(r.pal.secondary)}${r.aiNote ? `<div style="opacity:0.8;margin-top:2px;">⚠️ ${escHtml(r.aiNote)}</div>` : ''}</div></div>`;
        renderThemePanels(container, okHtml);
      } catch (err) {
        if (modalBackdrop && modalBackdrop._aiTimer) { clearInterval(modalBackdrop._aiTimer); modalBackdrop._aiTimer = null; }
        const s1 = container.querySelector('#agy-studio-ai-status');
        if (s1) {
          s1.style.display = 'block';
          s1.innerHTML = `⚠️ ${escHtml(err.message || err)}`;
        }
      }
    };
    if (modalBackdrop) modalBackdrop._handleAiFile = handleAiFile;
    if (aiDrop && aiInput) {
      aiDrop.addEventListener('click', (e) => { if (e.target !== aiInput) aiInput.click(); });
      aiDrop.addEventListener('dragover', (e) => { e.preventDefault(); aiDrop.style.background = 'rgba(255, 255, 255, 0.08)'; });
      aiDrop.addEventListener('dragleave', () => { aiDrop.style.background = mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'; });
      aiDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        aiDrop.style.background = mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)';
        handleAiFile(e.dataTransfer.files && e.dataTransfer.files[0]);
      });
      aiInput.addEventListener('change', () => handleAiFile(aiInput.files && aiInput.files[0]));
    }

    const slider = container.querySelector('#agy-dim-slider');
    const valLabel = container.querySelector('#agy-dim-val');
    slider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      valLabel.textContent = v + '%';
      applyTheme({ dimming: v });
    });

    const wpToggle = container.querySelector('#agy-wp-toggle');
    wpToggle.addEventListener('change', (e) => {
      applyTheme({ wpEnabled: e.target.checked });
    });

    const wpUpload = container.querySelector('#agy-wp-upload');
    wpUpload.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        applyTheme({ customWp: reader.result, wpEnabled: true });
        const toggle = container.querySelector('#agy-wp-toggle');
        if (toggle) toggle.checked = true;
      };
      reader.readAsDataURL(file);
    });

    const userAvUpload = container.querySelector('#agy-user-av-upload');
    const userAvPreview = container.querySelector('#agy-user-av-preview');
    const userAvClear = container.querySelector('#agy-user-av-clear');
    const agentAvUpload = container.querySelector('#agy-agent-av-upload');
    const agentAvPreview = container.querySelector('#agy-agent-av-preview');
    const agentAvClear = container.querySelector('#agy-agent-av-clear');

    function syncAvPreview(el, url, fallbackText) {
      if (!el) return;
      if (url) {
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else {
        el.style.backgroundImage = 'none';
        el.textContent = fallbackText;
      }
    }

    if (userAvUpload) {
      userAvUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAvatarFile(file, (dataUrl) => {
          applyTheme({ userAvatar: dataUrl });
          syncAvPreview(userAvPreview, dataUrl, 'U');
        });
      });
    }
    if (userAvClear) {
      userAvClear.addEventListener('click', () => {
        applyTheme({ userAvatar: 'none' });
        syncAvPreview(userAvPreview, '', 'U');
      });
    }
    if (agentAvUpload) {
      agentAvUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAvatarFile(file, (dataUrl) => {
          applyTheme({ agentAvatar: dataUrl });
          syncAvPreview(agentAvPreview, dataUrl, 'AI');
        });
      });
    }
    if (agentAvClear) {
      agentAvClear.addEventListener('click', () => {
        applyTheme({ agentAvatar: 'none' });
        syncAvPreview(agentAvPreview, '', 'AI');
      });
    }

    const blurSlider = container.querySelector('#agy-blur-slider');
    const blurLabel = container.querySelector('#agy-blur-val');
    if (blurSlider) {
      blurSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (blurLabel) blurLabel.textContent = v + 'px';
        applyTheme({ glassBlur: v });
      });
    }

    const avSizeSlider = container.querySelector('#agy-av-size');
    const avSizeVal = container.querySelector('#agy-av-size-val');
    if (avSizeSlider) {
      avSizeSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (avSizeVal) avSizeVal.textContent = v + 'px';
        applyTheme({ avatarSize: v });
      });
    }

    const avRadSlider = container.querySelector('#agy-av-rad');
    const avRadVal = container.querySelector('#agy-av-rad-val');
    if (avRadSlider) {
      avRadSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (avRadVal) avRadVal.textContent = v + '%';
        if (userAvPreview) userAvPreview.style.borderRadius = v + '%';
        if (agentAvPreview) agentAvPreview.style.borderRadius = v + '%';
        applyTheme({ avatarRadius: v });
      });
    }

    const exportBtn = container.querySelector('#agy-export-btn');
    const importToggle = container.querySelector('#agy-import-toggle');
    const importBox = container.querySelector('#agy-import-box');
    const importText = container.querySelector('#agy-import-text');
    const importApply = container.querySelector('#agy-import-apply');
    const importMsg = container.querySelector('#agy-import-msg');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = JSON.stringify(getState(), null, 2);
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(json).then(() => {
            exportBtn.textContent = 'Copied ✓';
            setTimeout(() => { exportBtn.textContent = 'Export JSON'; }, 1500);
          }).catch(() => {
            if (importBox && importText) {
              importBox.style.display = 'flex';
              importText.value = json;
              importText.select();
            }
          });
        } else if (importBox && importText) {
          importBox.style.display = 'flex';
          importText.value = json;
          importText.select();
        }
      });
    }
    if (importToggle && importBox) {
      importToggle.addEventListener('click', () => {
        importBox.style.display = importBox.style.display === 'none' ? 'flex' : 'none';
        if (importMsg) importMsg.textContent = '';
      });
    }
    if (importApply && importText) {
      importApply.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(importText.value.trim());
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Config must be a JSON object');
          }
          const allowed = {};
          const keys = ['themeName', 'bubbleName', 'inputStyle', 'dimming', 'wpEnabled', 'customWp', 'userAvatar', 'agentAvatar', 'glassBlur', 'avatarSize', 'avatarRadius', 'themeMode'];
          keys.forEach((k) => {
            if (parsed[k] !== undefined) allowed[k] = parsed[k];
          });
          applyTheme(allowed);
          renderThemePanels(container);
        } catch (err) {
          if (importMsg) importMsg.textContent = 'Invalid JSON: ' + err.message;
        }
      });
    }

    const resetBtn = container.querySelector('#agy-reset-btn');
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_CUSTOM_WP);
      localStorage.removeItem(STORAGE_USER_AVATAR);
      localStorage.removeItem(STORAGE_AGENT_AVATAR);
      localStorage.removeItem(STORAGE_GLASS_BLUR);
      localStorage.removeItem(STORAGE_AVATAR_SIZE);
      localStorage.removeItem(STORAGE_AVATAR_RADIUS);
      localStorage.removeItem(STORAGE_THEME);
      localStorage.removeItem(STORAGE_BUBBLE);
      localStorage.removeItem(STORAGE_INPUT);
      localStorage.removeItem(STORAGE_DIMMING);
      localStorage.removeItem(STORAGE_WP_ENABLED);
      localStorage.removeItem(STORAGE_THEME_MODE);
      const resetDefKey = getDefaultThemeKey();
      applyTheme({
        themeName: resetDefKey,
        bubbleName: resetDefKey,
        inputStyle: 'sync',
        dimming: 69,
        wpEnabled: true,
        customWp: '',
        userAvatar: '',
        agentAvatar: '',
        glassBlur: 3,
        avatarSize: 32,
        avatarRadius: 50,
        themeMode: 'dynamic'
      });
      const defTh = THEMES[resetDefKey] || {};
      syncThemeModeToggleBtn('dynamic', defTh.primary);
      syncAvPreview(userAvPreview, defTh.userAvatar || '', 'U');
      syncAvPreview(agentAvPreview, defTh.agentAvatar || '', 'AI');
      if (userAvPreview) userAvPreview.style.borderRadius = '50%';
      if (agentAvPreview) agentAvPreview.style.borderRadius = '50%';
      if (slider) slider.value = 69;
      if (valLabel) valLabel.textContent = '69%';
      if (blurSlider) blurSlider.value = 3;
      if (blurLabel) blurLabel.textContent = '3px';
      if (avSizeSlider) avSizeSlider.value = 32;
      if (avSizeVal) avSizeVal.textContent = '32px';
      if (avRadSlider) avRadSlider.value = 50;
      if (avRadVal) avRadVal.textContent = '50%';
      if (wpToggle) wpToggle.checked = true;

      container.querySelectorAll('.agy-preset-card').forEach(c => {
        const isSel = c.dataset.name === resetDefKey;
        c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        const slot = c.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      container.querySelectorAll('.agy-bubble-card').forEach(b => {
        const isSel = b.dataset.name === resetDefKey;
        b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
        const slot = b.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      container.querySelectorAll('.agy-input-card').forEach(c => {
        const isSel = c.dataset.style === 'sync';
        c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        c.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
        const slot = c.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      updateInputPreviews(resetDefKey);
    });

    const clearCustomBtn = container.querySelector('#agy-clear-custom-btn');
    if (clearCustomBtn) {
      clearCustomBtn.addEventListener('click', () => {
        if (clearAllCustomThemes()) openCustomThemeModal();
      });
    }

    const restoreBuiltinsBtn = container.querySelector('#agy-restore-builtins-btn');
    if (restoreBuiltinsBtn) {
      restoreBuiltinsBtn.addEventListener('click', () => {
        restoreBuiltinThemes();
        openCustomThemeModal();
      });
    }

    container.querySelectorAll('.agy-delete-preset-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(239, 68, 68, 0.85)';
        btn.style.borderColor = 'rgba(254, 202, 202, 0.75)';
        btn.style.color = '#ffffff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(10, 12, 18, 0.72)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.22)';
        btn.style.color = '#fca5a5';
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = btn.dataset.delPreset;
        if (name && deletePreset(name)) {
          openCustomThemeModal();
        }
      });
    });

    container.querySelectorAll('.agy-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        applyTheme({ themeName: name, bubbleName: name, customWp: '' });

        container.querySelectorAll('.agy-preset-card').forEach(c => {
          const isSel = c.dataset.name === name;
          c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          const slot = c.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        container.querySelectorAll('.agy-bubble-card').forEach(b => {
          const isSel = b.dataset.name === name;
          b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = b.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        updateInputPreviews(name);
      });
    });

    container.querySelectorAll('.agy-bubble-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        applyTheme({ bubbleName: name });

        container.querySelectorAll('.agy-bubble-card').forEach(b => {
          const isSel = b.dataset.name === name;
          b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = b.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        updateInputPreviews(name);
      });
    });

    container.querySelectorAll('.agy-input-card').forEach(card => {
      card.addEventListener('click', () => {
        const styleKey = card.dataset.style;
        applyTheme({ inputStyle: styleKey });

        container.querySelectorAll('.agy-input-card').forEach(c => {
          const isSel = c.dataset.style === styleKey;
          c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          c.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = c.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });
      });
    });
  }

  function injectMainSidebarButton() {
    if (document.getElementById('agy-custom-theme-sidebar-btn')) return;

    const sidebar = document.querySelector('.bg-sidebar');
    if (!sidebar) return;

    const spans = Array.from(sidebar.querySelectorAll('span'));
    const customSpan = spans.find(s => s.textContent?.trim() === 'Customizations');
    if (!customSpan) return;

    const row = customSpan.closest('a, button, div[role="button"], .group\\/headerbtn') || customSpan.parentElement;
    if (!row || !row.parentNode) return;

    const btn = document.createElement('button');
    btn.id = 'agy-custom-theme-sidebar-btn';
    btn.type = 'button';
    btn.className = 'w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer select-none';
    btn.style.cssText = 'text-align: left;';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Custom theme</span>
    `;

    row.parentNode.insertBefore(btn, row.nextSibling);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.__ANTIGRAVITY_OPEN_THEME_MODAL__();
    });
  }

  function injectSettingsModalButton() {
    const modal = document.querySelector('.settings-modal-container');
    if (!modal || document.getElementById('agy-custom-theme-settings-btn')) return;

    const headers = Array.from(modal.querySelectorAll('h2, h3'));
    const appearanceHeader = headers.find(h => h.textContent?.trim() === 'Appearance');
    if (!appearanceHeader) return;

    let targetContainer = appearanceHeader.parentElement;
    while (targetContainer && !targetContainer.className.includes('justify-between') && targetContainer !== modal) {
      targetContainer = targetContainer.parentElement;
    }

    if (!targetContainer || !targetContainer.parentNode) return;

    Array.from(targetContainer.parentNode.children).forEach(child => {
      if (child.id === 'agy-custom-theme-settings-btn') child.remove();
    });

    const btn = document.createElement('button');
    btn.id = 'agy-custom-theme-settings-btn';
    btn.type = 'button';
    btn.className = 'select-none rounded px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer text-white';
    btn.style.cssText = 'background: linear-gradient(135deg, #e08e55 0%, #b45309 100%); border: 1px solid rgba(251, 191, 36, 0.4); box-shadow: 0 2px 10px rgba(224, 142, 85, 0.3); margin-top: 8px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px;';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
      <span>Open Custom Theme Studio</span>
    `;

    targetContainer.parentNode.insertBefore(btn, targetContainer.nextSibling);

    btn.addEventListener('click', () => {
      window.__ANTIGRAVITY_OPEN_THEME_MODAL__();
    });
  }

  function hookSidebarScroll() {
    if (!window.__AGY_SCROLL_AC__) return;
    const scrollers = document.querySelectorAll('.agy-shell .bg-sidebar .overflow-y-auto');
    scrollers.forEach(sc => {
      if (sc.dataset.agyScrollBound) return;
      sc.dataset.agyScrollBound = '1';
      const sync = () => sc.classList.toggle('agy-scrolled', sc.scrollTop > 2);
      sync();
      sc.addEventListener('scroll', sync, { passive: true, signal: window.__AGY_SCROLL_AC__.signal });
    });
  }

  function syncShellMetrics() {
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;
    const split = shell.querySelector('[data-testid="sidebar-split"]');
    const sidebarPane = split ? split.firstElementChild : null;
    const titleBar = shell.querySelector('[class*="@container/titlebar"]');
    const sw = sidebarPane ? Math.round(sidebarPane.getBoundingClientRect().width) : 0;
    const shellRect = shell.getBoundingClientRect();
    const hdrBottom = titleBar ? Math.round(titleBar.getBoundingClientRect().bottom - shellRect.top) : 35;
    shell.style.setProperty('--agy-sidebar-w', sw + 'px');
    shell.style.setProperty('--agy-hdr-h', hdrBottom + 'px');

    const hasHoleAttr = document.body.getAttribute('data-has-browser-hole') === 'true';
    const holeEl = hasHoleAttr ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    if (holeEl) {
      if (window.__AGY_SHELL_RO__ && window.__AGY_HOLE_EL__ !== holeEl) {
        try { window.__AGY_SHELL_RO__.observe(holeEl); } catch (e) {}
        window.__AGY_HOLE_EL__ = holeEl;
      }
      const hRect = holeEl.getBoundingClientRect();
      if (hRect.width > 1 && hRect.height > 1) {
        const l = Math.max(0, Math.round(hRect.left - shellRect.left));
        const t = Math.max(0, Math.round(hRect.top - shellRect.top));
        const r = Math.max(l, Math.round(hRect.right - shellRect.left));
        const b = Math.max(t, Math.round(hRect.bottom - shellRect.top));
        shell.style.setProperty(
          '--agy-hole-clip',
          `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`
        );
        shell.dataset.agyHoleActive = '1';
        delete shell.dataset.agySideGlass;
        return;
      }
    }
    window.__AGY_HOLE_EL__ = null;
    delete shell.dataset.agyHoleActive;
    shell.style.removeProperty('--agy-hole-clip');

    const sideBody = shell.querySelector('[data-side-panel-body="true"]');
    if (sideBody) {
      if (window.__AGY_SHELL_RO__ && window.__AGY_SIDE_EL__ !== sideBody) {
        try { window.__AGY_SHELL_RO__.observe(sideBody); } catch (e) {}
        window.__AGY_SIDE_EL__ = sideBody;
      }
      const sRect = sideBody.getBoundingClientRect();
      const hasContent = sideBody.children.length > 0;
      if (hasContent && sRect.width > 24 && sRect.height > 24 && sRect.left < shellRect.right - 8 && sRect.right > shellRect.left + 8) {
        const sl = Math.max(sw, Math.round(sRect.left - shellRect.left));
        const st = Math.max(hdrBottom, Math.round(sRect.top - shellRect.top));
        const sr = Math.min(Math.round(shellRect.width), Math.max(sl, Math.round(sRect.right - shellRect.left)));
        const sb = Math.min(Math.round(shellRect.height), Math.max(st, Math.round(sRect.bottom - shellRect.top)));
        if (sr - sl > 20 && sb - st > 20) {
          shell.style.setProperty('--agy-side-l', sl + 'px');
          shell.style.setProperty('--agy-side-t', st + 'px');
          shell.style.setProperty('--agy-side-r', sr + 'px');
          shell.style.setProperty('--agy-side-b', sb + 'px');
          shell.dataset.agySideGlass = '1';
          return;
        }
      }
    }
    delete shell.dataset.agySideGlass;
  }

  function hookShellMetrics() {
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;
    if (!shell.dataset.agyTboMounted) {
      shell.dataset.agyTboMounted = '1';
      scheduleTitleBarSync();
    }
    if (!window.__AGY_SHELL_RO__ && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncShellMetrics);
      ro.observe(shell);
      const sidebarPane = shell.querySelector('[data-testid="sidebar-split"]')?.firstElementChild;
      if (sidebarPane) ro.observe(sidebarPane);
      window.__AGY_SHELL_RO__ = ro;
    }
    syncShellMetrics();
  }

  // ---- Image -> theme generator (top bar popup) ----
  const MAX_CUSTOM_THEMES = 8;

  function loadHiddenBuiltins() {
    const raw = localStorage.getItem(STORAGE_HIDDEN_BUILTINS);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((k) => BUILTIN_KEYS.has(k));
      } catch (e) {}
    }
    const init = (window.__AGY_INITIAL_CONFIG__ && Array.isArray(window.__AGY_INITIAL_CONFIG__.hiddenBuiltins))
      ? window.__AGY_INITIAL_CONFIG__.hiddenBuiltins
      : [];
    return init.filter((k) => BUILTIN_KEYS.has(k));
  }

  function persistHiddenBuiltins(list) {
    const clean = Array.from(new Set(list.filter((k) => BUILTIN_KEYS.has(k))));
    if (window.__AGY_INITIAL_CONFIG__) window.__AGY_INITIAL_CONFIG__.hiddenBuiltins = [...clean];
    try { localStorage.setItem(STORAGE_HIDDEN_BUILTINS, JSON.stringify(clean)); } catch (e) {}
    if (window.agySaveThemeConfig) {
      try { window.agySaveThemeConfig(JSON.stringify({ hiddenBuiltins: clean })); } catch (e) {}
    }
  }

  function loadCustomThemes() {
    const init = (window.__AGY_INITIAL_CONFIG__ && window.__AGY_INITIAL_CONFIG__.customThemes) || null;
    if (init && typeof init === 'object' && !Array.isArray(init)) {
      return { ...init };
    }
    const raw = localStorage.getItem(STORAGE_CUSTOM_THEMES);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return {};
  }

  function registerCustomThemes() {
    const all = loadCustomThemes();
    Object.keys(all).forEach((name) => {
      if (BUILTIN_KEYS.has(name)) return;
      THEMES[name] = enforceReadableTheme({ ...all[name] });
      if (!THEME_KEYS.includes(name)) THEME_KEYS.push(name);
    });
    const hidden = new Set(loadHiddenBuiltins());
    hidden.forEach((name) => {
      if (!BUILTIN_KEYS.has(name) || THEME_KEYS.length <= 1) return;
      delete THEMES[name];
      const ix = THEME_KEYS.indexOf(name);
      if (ix >= 0) THEME_KEYS.splice(ix, 1);
    });
  }

  function persistCustomThemes(all) {
    if (window.__AGY_INITIAL_CONFIG__) window.__AGY_INITIAL_CONFIG__.customThemes = { ...all };
    try {
      localStorage.setItem(STORAGE_CUSTOM_THEMES, JSON.stringify(all));
    } catch (e) {
      // 4K WebP themes can exceed the 5MB localStorage quota; clear stale localStorage so disk theme_config.json stays authoritative.
      try { localStorage.removeItem(STORAGE_CUSTOM_THEMES); } catch (_) {}
    }
    if (window.agySaveThemeConfig) {
      try { window.agySaveThemeConfig(JSON.stringify({ customThemes: all })); } catch (e) {}
    }
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  const hex2 = (n) => n.toString(16).padStart(2, '0');
  const toHex = (c) => '#' + c.map(hex2).join('');
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  function analyzePalette(img) {
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, S, S);
    const data = cx.getImageData(0, 0, S, S).data;
    let ar = 0, ag = 0, ab = 0, n = 0;
    const B = 24;
    const buckets = Array.from({ length: B }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      ar += r; ag += g; ab += b; n++;
      const [h, s, v] = rgbToHsv(r, g, b);
      if (s < 0.22 || v < 0.3) continue;
      const w = s * v * v;
      const bk = buckets[Math.floor(h / (360 / B)) % B];
      bk.w += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
    }
    n = Math.max(1, n);
    const avg = [Math.round(ar / n), Math.round(ag / n), Math.round(ab / n)];
    const lum = (0.2126 * avg[0] + 0.7152 * avg[1] + 0.0722 * avg[2]) / 255;
    const sorted = buckets.map((bk, i) => ({ ...bk, i })).filter((bk) => bk.w > 0).sort((a, b) => b.w - a.w);
    const isLight = false;
    const tune = (c, sMin, vMin, vMax) => {
      const [h, s, v] = rgbToHsv(c[0], c[1], c[2]);
      return hsvToRgb(h, Math.max(s, sMin), Math.min(vMax, Math.max(v, vMin)));
    };
    let primary, secondary;
    if (sorted.length) {
      const p = sorted[0];
      primary = [Math.round(p.r / p.w), Math.round(p.g / p.w), Math.round(p.b / p.w)];
      const q = sorted.find((bk) => {
        const d = Math.abs(bk.i - p.i); return Math.min(d, B - d) >= 3;
      });
      if (q) secondary = [Math.round(q.r / q.w), Math.round(q.g / q.w), Math.round(q.b / q.w)];
      else { const [h, s, v] = rgbToHsv(primary[0], primary[1], primary[2]); secondary = hsvToRgb(h + 35, s * 0.8, v); }
    } else {
      const base = [148, 163, 184];
      primary = base; secondary = base.map((x) => Math.min(255, x + 40));
    }
    primary = tune(primary, 0.45, 0.75, 0.98);
    secondary = tune(secondary, 0.35, 0.70, 0.96);
    const overlay = avg.map((x) => Math.max(4, Math.min(22, Math.round(x * 0.1))));
    return { avg, lum, isLight, primary, secondary, overlay };
  }

  function makeOrnaments(p, s, o) {
    const P = toHex(p), S = toHex(s);
    const tint = toHex(p.map((x) => Math.round(x + (255 - x) * 0.82)));
    const orb = toHex(o.map((x) => Math.round(x * 0.5)));
    const corner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" fill="none"><path d="M 3 26 L 3 9 Q 3 3 9 3 L 26 3" stroke="${P}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/><path d="M 7 19 L 7 11 Q 7 7 11 7 L 19 7" stroke="${S}" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/><path d="M 8.5 4.5 L 9.5 7.5 L 12.5 8.5 L 9.5 9.5 L 8.5 12.5 L 7.5 9.5 L 4.5 8.5 L 7.5 7.5 Z" fill="${tint}"/><circle cx="29" cy="3" r="1.5" fill="${P}" opacity="0.85"/><path d="M 2 34 Q 18 18 34 2" stroke="${P}" stroke-opacity="0.4" stroke-width="0.9" stroke-dasharray="2 3"/></svg>`;
    const sticker = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 38" fill="none"><defs><linearGradient id="og" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stop-color="${P}" stop-opacity="0.1"/><stop offset="40%" stop-color="${P}" stop-opacity="0.9"/><stop offset="70%" stop-color="${tint}" stop-opacity="0.95"/><stop offset="100%" stop-color="${S}" stop-opacity="0.2"/></linearGradient><radialGradient id="pg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${orb}"/><stop offset="85%" stop-color="${orb}"/><stop offset="100%" stop-color="${P}" stop-opacity="0.8"/></radialGradient></defs><path d="M 6 26 Q 64 6 122 22" stroke="url(#og)" stroke-width="1.3" stroke-linecap="round"/><path d="M 16 30 Q 64 12 112 25" stroke="${P}" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.6"/><g transform="translate(64, 18)"><circle cx="0" cy="0" r="7.5" fill="url(#pg)" stroke="${P}" stroke-width="0.8"/><ellipse cx="0" cy="0" rx="14" ry="4.2" stroke="${tint}" stroke-width="0.9" transform="rotate(-15)" opacity="0.85"/></g><path d="M 22 18 L 23.2 15 L 26 14 L 23.2 13 L 22 10 L 20.8 13 L 18 14 L 20.8 15 Z" fill="${tint}" opacity="0.9"/><path d="M 104 15 L 105 12.8 L 107 12 L 105 11.2 L 104 9 L 103 11.2 L 101 12 L 103 12.8 Z" fill="${P}" opacity="0.85"/><circle cx="38" cy="14" r="1.2" fill="#ffffff" opacity="0.75"/><circle cx="90" cy="22" r="1.1" fill="${S}" opacity="0.8"/></svg>`;
    const uri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);
    return { cornerSvg: uri(corner), sticker: uri(sticker) };
  }

  function parseCssColor(str) {
    if (typeof str !== 'string') return null;
    const s = str.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(s);
    if (rgb) {
      return {
        r: Math.min(255, Math.max(0, Number(rgb[1]))),
        g: Math.min(255, Math.max(0, Number(rgb[2]))),
        b: Math.min(255, Math.max(0, Number(rgb[3]))),
        a: rgb[4] !== undefined ? Math.min(1, Math.max(0, Number(rgb[4]))) : 1
      };
    }
    return null;
  }

  function extractFirstColor(cssBg) {
    if (typeof cssBg !== 'string') return null;
    const direct = parseCssColor(cssBg);
    if (direct) return direct;
    const m = /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|#[0-9a-f]{3,8}\b/i.exec(cssBg);
    return m ? parseCssColor(m[0]) : null;
  }

  function relLum(c) {
    const ch = [c.r, c.g, c.b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function contrastRatio(c1, c2) {
    const l1 = relLum(c1), l2 = relLum(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function compositeOver(fg, bg) {
    const a = fg.a !== undefined ? fg.a : 1;
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
      a: 1
    };
  }

  function enforceSurfaceAlpha(cssColor, minAlpha, isLight, fallbackCss) {
    const parsed = parseCssColor(cssColor);
    if (!parsed) return fallbackCss;
    const lum = relLum(parsed);
    if (isLight && lum < 0.55) return fallbackCss;
    if (!isLight && lum > 0.06) return fallbackCss;
    const a = Math.max(minAlpha, parsed.a);
    return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${Number(a.toFixed(2))})`;
  }

  function ensureReadableInk(inkCss, surfaceCss, minRatio, isLight, fallbackHex) {
    const ink = parseCssColor(inkCss);
    const surf = extractFirstColor(surfaceCss) || (isLight ? { r: 248, g: 250, b: 252, a: 0.9 } : { r: 10, g: 14, b: 24, a: 0.9 });
    const worstUnder = isLight ? { r: 24, g: 28, b: 36, a: 1 } : { r: 235, g: 240, b: 248, a: 1 };
    const effectiveBg = compositeOver(surf, worstUnder);
    const pureBg = { r: surf.r, g: surf.g, b: surf.b, a: 1 };
    if (ink) {
      const effInk = compositeOver(ink, effectiveBg);
      const rWorst = contrastRatio(effInk, effectiveBg);
      const rPure = contrastRatio(compositeOver(ink, pureBg), pureBg);
      if (rWorst >= minRatio && rPure >= minRatio) return inkCss;
    }
    return fallbackHex;
  }

  function enforceReadableTheme(t, pal) {
    delete t.isLight;
    const L = false;
    const ovParts = String(t.overlayRgb || '').split(',').map((x) => parseInt(x.trim(), 10));
    const validOv = ovParts.length === 3 && ovParts.every((n) => Number.isFinite(n) && n >= 0 && n <= 255);
    const ovColor = validOv ? { r: ovParts[0], g: ovParts[1], b: ovParts[2], a: 1 } : null;
    if (!ovColor) {
      t.overlayRgb = '7, 13, 22';
    } else if (relLum(ovColor) > 0.06) {
      const maxCh = Math.max(1, ovColor.r, ovColor.g, ovColor.b);
      const scaled = [ovColor.r, ovColor.g, ovColor.b].map((ch) => Math.max(5, Math.min(20, Math.round((ch / maxCh) * 18))));
      t.overlayRgb = scaled.join(', ');
    }
    const ov = t.overlayRgb;
    t.aiCardBg = enforceSurfaceAlpha(t.aiCardBg, 0.88, L, `rgba(${ov}, 0.90)`);
    t.sidebarBg = enforceSurfaceAlpha(t.sidebarBg, 0.64, L, `rgba(${ov}, 0.66)`);
    t.headerBg = enforceSurfaceAlpha(t.headerBg, 0.64, L, `rgba(${ov}, 0.66)`);
    t.inputGlassBg = enforceSurfaceAlpha(t.inputGlassBg, 0.82, L, `rgba(${ov}, 0.84)`);
    t.modalBg = enforceSurfaceAlpha(t.modalBg, 0.96, L, 'rgba(10, 14, 24, 0.97)');
    t.cardBg = enforceSurfaceAlpha(t.cardBg, 0.88, L, 'rgba(14, 20, 34, 0.88)');
    t.pillBg = enforceSurfaceAlpha(t.pillBg, 0.84, L, `rgba(${ov}, 0.86)`);

    const icBase = extractFirstColor(t.inputCardBg);
    if (!icBase || relLum(icBase) > 0.08 || icBase.a < 0.88) {
      t.inputCardBg = `linear-gradient(145deg, rgba(${ov}, 0.92) 0%, rgba(5, 9, 16, 0.96) 100%)`;
    }
    const bgBase = extractFirstColor(t.bg);
    if (!bgBase || relLum(bgBase) > 0.12 || bgBase.a < 0.88) {
      t.bg = `linear-gradient(145deg, rgba(${ov}, 0.92) 0%, rgba(6, 10, 18, 0.96) 100%)`;
    }

    t.uiTextColor = ensureReadableInk(t.uiTextColor, t.aiCardBg, 9.0, L, '#f8fafc');
    t.uiMutedColor = ensureReadableInk(t.uiMutedColor, t.aiCardBg, 6.0, L, '#cbd5e1');
    t.pillTextColor = ensureReadableInk(t.pillTextColor, t.pillBg, 9.0, L, '#f8fafc');
    t.textColor = ensureReadableInk(t.textColor, t.bg, 9.0, L, '#f8fafc');
    t.sidebarEnhanceText = true;
    return t;
  }

  function buildThemeFromPalette(pal, wallpaper, concept) {
    const p = pal.primary, s = pal.secondary, o = pal.overlay;
    const ov = o.join(', ');
    const L = pal.isLight;
    const dark = (a) => `rgba(${ov}, ${a})`;
    const t = {
      concept,
      primary: toHex(p), secondary: toHex(s),
      glow: rgba(p, 0.28), secondaryGlow: rgba(s, 0.22),
      bg: `linear-gradient(145deg, rgba(${Math.round(p[0] * 0.18)}, ${Math.round(p[1] * 0.18)}, ${Math.round(p[2] * 0.18)}, 0.92) 0%, rgba(6, 8, 14, 0.96) 100%)`,
      frameBg: `linear-gradient(135deg, ${rgba(p, 0.72)} 0%, ${rgba(s, 0.5)} 50%, ${rgba(p, 0.6)} 100%)`,
      textColor: '#f8fafc',
      borderColor: rgba(p, 0.34), innerBorder: `1px solid ${rgba(p, 0.16)}`,
      clearBackdrop: true, overlayRgb: ov, bgPosition: 'center center',
      sidebarBg: dark(L ? 0.66 : 0.5), sidebarBlur: '3px', sidebarHoverBg: rgba(p, 0.18), sidebarEnhanceText: true,
      aiCardBg: L ? 'rgba(255, 255, 255, 0.9)' : dark(0.86), aiCardBorder: rgba(p, 0.22),
      headerBg: dark(L ? 0.66 : 0.5), headerBlur: '3px', headerBorder: rgba(p, 0.14),
      unifiedGlass: true,
      btnBg: L ? 'rgba(255, 255, 255, 0.82)' : `rgba(${Math.round(p[0] * 0.12 + 8)}, ${Math.round(p[1] * 0.12 + 14)}, ${Math.round(p[2] * 0.12 + 24)}, 0.76)`,
      inputGlassBg: L ? 'rgba(255, 255, 255, 0.84)' : dark(0.74),
      inputCardBg: L ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.95) 100%)' : `linear-gradient(145deg, rgba(${Math.round(p[0] * 0.14)}, ${Math.round(p[1] * 0.14)}, ${Math.round(p[2] * 0.14)}, 0.92) 0%, rgba(5, 8, 14, 0.96) 100%)`,
      modalBg: L ? 'rgba(248, 250, 252, 0.97)' : `rgba(${Math.round(p[0] * 0.08 + 5)}, ${Math.round(p[1] * 0.08 + 8)}, ${Math.round(p[2] * 0.08 + 14)}, 0.97)`,
      modalHeaderBg: L ? 'rgba(226, 232, 240, 0.94)' : `rgba(${Math.round(p[0] * 0.12 + 8)}, ${Math.round(p[1] * 0.12 + 12)}, ${Math.round(p[2] * 0.12 + 20)}, 0.94)`,
      cardBg: L ? 'rgba(255, 255, 255, 0.88)' : `rgba(${Math.round(p[0] * 0.1 + 8)}, ${Math.round(p[1] * 0.1 + 12)}, ${Math.round(p[2] * 0.1 + 22)}, 0.88)`,
      cardSelectedBg: rgba(p, L ? 0.22 : 0.24),
      wallpaper, isOrnament: true, ...makeOrnaments(p, s, o), stickerW: 96, stickerH: 30, stickerTop: -15, stickerRight: 14,
      isCustomImageTheme: true
    };
    if (L) {
      t.isLight = true; t.uiTextColor = '#0f172a'; t.uiMutedColor = '#334155';
      t.pillBg = 'rgba(255, 255, 255, 0.88)'; t.pillHoverBg = 'rgba(255, 255, 255, 0.96)';
      t.pillTextColor = '#0f172a'; t.pillBorder = rgba(p, 0.35);
    } else {
      t.uiTextColor = '#f8fafc'; t.uiMutedColor = '#e2e8f0';
      t.pillBg = 'rgba(8, 14, 28, 0.84)'; t.pillHoverBg = 'rgba(12, 22, 42, 0.94)';
      t.pillTextColor = '#f8fafc'; t.pillBorder = rgba(p, 0.32);
    }
    return enforceReadableTheme(t, pal);
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
      img.src = url;
    });
  }

  function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không tải được ảnh kết quả'));
      img.src = src;
    });
  }

  function encodeSourceForAi(img) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const k = Math.min(1, 2048 / Math.max(sw, sh));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(sw * k));
    cv.height = Math.max(1, Math.round(sh * k));
    const cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    let out = cv.toDataURL('image/webp', 0.92);
    if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', 0.92);
    return out;
  }

  function progressiveScaleToCanvas(src, dstW, dstH) {
    let cur = src;
    let cw = src.naturalWidth || src.width;
    let ch = src.naturalHeight || src.height;
    const makeStep = (w, h) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(cur, 0, 0, c.width, c.height);
      return c;
    };
    while (cw * 1.85 < dstW || ch * 1.85 < dstH) {
      cw = Math.min(dstW, Math.round(cw * 1.8));
      ch = Math.min(dstH, Math.round(ch * 1.8));
      cur = makeStep(cw, ch);
    }
    while (cw > dstW * 2.1 || ch > dstH * 2.1) {
      cw = Math.max(dstW, Math.round(cw * 0.55));
      ch = Math.max(dstH, Math.round(ch * 0.55));
      cur = makeStep(cw, ch);
    }
    if (cw !== dstW || ch !== dstH || cur === src) {
      cur = makeStep(dstW, dstH);
    }
    return cur;
  }

  function sharpenCanvas(cv, amount) {
    if (!amount || amount <= 0.02) return;
    const w = cv.width, h = cv.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const out = new Uint8ClampedArray(src);
    const a = Math.min(0.45, Math.max(0.05, amount));
    const rowStride = w * 4;
    for (let y = 1; y < h - 1; y++) {
      let idx = y * rowStride + 4;
      for (let x = 1; x < w - 1; x++, idx += 4) {
        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          const avg = (
            src[idx - 4 + c] + src[idx + 4 + c] +
            src[idx - rowStride + c] + src[idx + rowStride + c]
          ) * 0.25;
          const diff = center - avg;
          // Suppress micro-noise while sharpening real detail edges
          if (Math.abs(diff) > 2.5) {
            const v = center + diff * a * 2.4;
            out[idx + c] = v < 0 ? 0 : (v > 255 ? 255 : v);
          }
        }
      }
    }
    imgData.data.set(out);
    ctx.putImageData(imgData, 0, 0);
  }

  function finalize4k16x9Wallpaper(img) {
    const targetW = 3840;
    const targetH = 2160;
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const scale = Math.max(targetW / sw, targetH / sh);
    const drawW = Math.round(sw * scale);
    const drawH = Math.round(sh * scale);

    const scaled = progressiveScaleToCanvas(img, drawW, drawH);
    if (scale > 1.05) {
      sharpenCanvas(scaled, Math.min(0.42, 0.16 + (scale - 1) * 0.14));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(scaled, Math.round((targetW - drawW) / 2), Math.round((targetH - drawH) / 2));

    let dataUrl = canvas.toDataURL('image/webp', 0.9);
    if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return { dataUrl, canvas, width: targetW, height: targetH };
  }

  // ---- AI design (agy CLI via daemon) ----
  window.__AGY_DESIGN_PENDING__ = window.__AGY_DESIGN_PENDING__ || {};
  window.__AGY_DESIGN_RESULT_V2__ = (id, json) => {
    const p = window.__AGY_DESIGN_PENDING__[id];
    if (!p) return;
    delete window.__AGY_DESIGN_PENDING__[id];
    clearTimeout(p.t);
    try {
      const r = JSON.parse(json);
      if (r.error) p.reject(new Error(r.error));
      else p.resolve({ theme: r.theme, wallpaperDataUrl: r.wallpaperDataUrl || '', wpMeta: r.wpMeta || null });
    } catch (e) { p.reject(e); }
  };

  function requestAiDesign(payloadObj) {
    if (typeof window.agyDesignThemeV2 !== 'function') {
      return Promise.reject(new Error('Daemon chưa nâng cấp V2 hoặc chưa khởi động lại (hãy chạy install-win.ps1)'));
    }
    return new Promise((resolve, reject) => {
      const id = 'd' + Date.now() + Math.random().toString(36).slice(2, 6);
      const t = setTimeout(() => {
        delete window.__AGY_DESIGN_PENDING__[id];
        reject(new Error('AI thiết kế quá thời gian chờ'));
      }, 420000);
      window.__AGY_DESIGN_PENDING__[id] = { resolve, reject, t };
      try { window.agyDesignThemeV2(JSON.stringify({ id, ...payloadObj })); }
      catch (e) { clearTimeout(t); delete window.__AGY_DESIGN_PENDING__[id]; reject(e); }
    });
  }

  const CSS_SAFE = /^[#a-zA-Z0-9(),.%\s\-/+]+$/;
  function cssVal(v, fallback) {
    if (typeof v !== 'string') return fallback;
    const s = v.trim();
    if (!s || s.length > 400 || !CSS_SAFE.test(s) || /url\s*\(|expression|import/i.test(s)) return fallback;
    return s;
  }
  function numIn(v, lo, hi, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  }
  function svgToDataUri(markup, fallbackUri) {
    if (typeof markup !== 'string') return fallbackUri;
    const raw = markup.trim();
    const start = raw.search(/<svg[\s>]/i);
    const end = raw.lastIndexOf('</svg>');
    if (start < 0 || end < start) return fallbackUri;
    let s = raw.slice(start, end + 6);
    if (s.length > 20000) return fallbackUri;
    if (/<\s*(script|foreignObject|image|style|iframe|use)\b|\son\w+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)/i.test(s)) return fallbackUri;
    if (!/xmlns=/.test(s)) s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  function sanitizeDesignedTheme(raw, wallpaper, pal) {
    const fb = buildThemeFromPalette(pal, wallpaper, 'AI Glass');
    const ornaments = makeOrnaments(pal.primary, pal.secondary, pal.overlay);
    const t = { ...fb };
    ['primary', 'secondary', 'glow', 'secondaryGlow', 'bg', 'frameBg', 'textColor', 'borderColor', 'innerBorder',
      'bgPosition', 'sidebarBg', 'sidebarHoverBg', 'aiCardBg', 'aiCardBorder', 'headerBg', 'headerBorder',
      'btnBg', 'inputGlassBg', 'inputCardBg', 'modalBg', 'modalHeaderBg', 'cardBg', 'cardSelectedBg'
    ].forEach((k) => { t[k] = cssVal(raw[k], fb[k]); });
    if (typeof raw.concept === 'string' && raw.concept.trim()) t.concept = raw.concept.trim().slice(0, 80);
    t.overlayRgb = /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(String(raw.overlayRgb || '').trim()) ? String(raw.overlayRgb).trim() : fb.overlayRgb;
    t.isLight = !!raw.isLight;
    t.sidebarEnhanceText = raw.sidebarEnhanceText !== false;
    if (t.isLight) {
      ['uiTextColor', 'uiMutedColor', 'pillBg', 'pillHoverBg', 'pillTextColor', 'pillBorder'].forEach((k) => {
        const v = cssVal(raw[k], fb[k]); if (v) t[k] = v;
      });
    } else {
      delete t.isLight;
      ['uiTextColor', 'uiMutedColor', 'pillBg', 'pillHoverBg', 'pillTextColor', 'pillBorder'].forEach((k) => {
        const v = cssVal(raw[k], ''); if (v) t[k] = v;
      });
    }
    t.cornerSvg = svgToDataUri(raw.cornerSvgMarkup, ornaments.cornerSvg);
    t.sticker = svgToDataUri(raw.stickerSvgMarkup, ornaments.sticker);
    t.isOrnament = true;
    t.bgPosition = 'center center';
    t.stickerW = numIn(raw.stickerW, 40, 200, 96);
    t.stickerH = numIn(raw.stickerH, 12, 60, 30);
    t.stickerTop = numIn(raw.stickerTop, -40, 0, -15);
    t.stickerRight = numIn(raw.stickerRight, -20, 60, 14);
    t.isAiDesigned = true;
    return enforceReadableTheme(t, pal);
  }

  async function createThemeFromImageFile(file, onStatus) {
    if (!file || !/^image\//.test(file.type)) throw new Error('File không phải ảnh');
    const { img, url } = await loadImageFromFile(file);
    try {
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      if (onStatus) {
        onStatus('AI đang vẽ tranh mới chuẩn 4K 16:9 theo chủ đề ảnh gốc và thiết kế bảng màu (khoảng 1–2 phút)…');
      }
      let res;
      try {
        res = await requestAiDesign({ image: encodeSourceForAi(img), width: sw, height: sh });
      } catch (e) {
        throw new Error(`Không tạo được tranh 4K 16:9 mới bằng AI: ${e.message || e}`);
      }
      if (!res || !res.wallpaperDataUrl) {
        throw new Error('Không tạo được tranh 4K 16:9 mới bằng AI: AI không trả về ảnh 4K 16:9');
      }

      const aiImg = await loadImageFromSrc(res.wallpaperDataUrl);
      const wallpaper = (aiImg.naturalWidth === 3840 && aiImg.naturalHeight === 2160 && res.wallpaperDataUrl.startsWith('data:image/webp'))
        ? res.wallpaperDataUrl
        : finalize4k16x9Wallpaper(aiImg).dataUrl;
      const wpMeta = {
        width: 3840,
        height: 2160,
        aiOutpainted: !!(res.wpMeta && res.wpMeta.aiOutpainted !== false)
      };
      const pal = analyzePalette(aiImg);
      const theme = sanitizeDesignedTheme(res.theme || {}, wallpaper, pal);
      const aiName = res.theme && typeof res.theme.name === 'string'
        ? res.theme.name.trim().replace(/[^\p{L}\p{N} '&-]/gu, '').slice(0, 24)
        : '';

      let base = aiName || (file.name || 'My Theme').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 24) || 'My Theme';
      let name = base, i = 2;
      while (THEMES[name]) name = `${base} ${i++}`;
      const all = loadCustomThemes();
      all[name] = theme;
      const names = Object.keys(all);
      while (names.length > MAX_CUSTOM_THEMES) {
        const old = names.shift();
        delete all[old]; delete THEMES[old];
        const ix = THEME_KEYS.indexOf(old); if (ix >= 0) THEME_KEYS.splice(ix, 1);
      }
      THEMES[name] = theme;
      if (!THEME_KEYS.includes(name)) THEME_KEYS.push(name);
      persistCustomThemes(all);
      applyTheme({ themeName: name, bubbleName: name, customWp: '' });
      return {
        name,
        pal: { primary: hexToRgbList(theme.primary), secondary: hexToRgbList(theme.secondary), overlay: theme.overlayRgb.split(',').map((x) => parseInt(x, 10)), isLight: false },
        wallpaper,
        aiNote: '',
        ai: !!theme.isAiDesigned,
        wpMeta
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function hexToRgbList(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    if (!m) return [128, 128, 128];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function deletePreset(name) {
    if (!THEMES[name] || THEME_KEYS.length <= 1) return false;
    if (BUILTIN_KEYS.has(name)) {
      const hidden = loadHiddenBuiltins();
      if (!hidden.includes(name)) hidden.push(name);
      persistHiddenBuiltins(hidden);
    } else {
      const all = loadCustomThemes();
      delete all[name];
      persistCustomThemes(all);
    }
    delete THEMES[name];
    const ix = THEME_KEYS.indexOf(name);
    if (ix >= 0) THEME_KEYS.splice(ix, 1);
    const st = getState();
    if (!THEMES[st.themeName] || !THEMES[st.bubbleName]) {
      const nextTheme = THEMES[st.themeName] ? st.themeName : THEME_KEYS[0];
      const nextBubble = THEMES[st.bubbleName] ? st.bubbleName : THEME_KEYS[0];
      applyTheme({ themeName: nextTheme, bubbleName: nextBubble });
    }
    return true;
  }

  function clearAllCustomThemes() {
    const customNames = THEME_KEYS.filter((k) => !BUILTIN_KEYS.has(k));
    if (!customNames.length) return false;
    customNames.forEach((name) => {
      delete THEMES[name];
      const ix = THEME_KEYS.indexOf(name);
      if (ix >= 0) THEME_KEYS.splice(ix, 1);
    });
    if (THEME_KEYS.length === 0) {
      persistHiddenBuiltins([]);
      Object.keys(BUILTIN_THEMES).forEach((name) => {
        THEMES[name] = BUILTIN_THEMES[name];
        THEME_KEYS.push(name);
      });
    }
    persistCustomThemes({});
    const st = getState();
    if (!THEMES[st.themeName] || !THEMES[st.bubbleName]) {
      const nextTheme = THEMES[st.themeName] ? st.themeName : THEME_KEYS[0];
      const nextBubble = THEMES[st.bubbleName] ? st.bubbleName : THEME_KEYS[0];
      applyTheme({ themeName: nextTheme, bubbleName: nextBubble });
    }
    return true;
  }

  function restoreBuiltinThemes() {
    persistHiddenBuiltins([]);
    const customOrder = THEME_KEYS.filter((k) => !BUILTIN_KEYS.has(k));
    THEME_KEYS.length = 0;
    Object.keys(BUILTIN_THEMES).forEach((name) => {
      THEMES[name] = BUILTIN_THEMES[name];
      THEME_KEYS.push(name);
    });
    customOrder.forEach((name) => {
      if (THEMES[name] && !THEME_KEYS.includes(name)) THEME_KEYS.push(name);
    });
  }

  function closeQuickThemeMenu() {
    const m = document.getElementById('agy-theme-popup-backdrop');
    if (m) {
      if (typeof m._cleanup === 'function') m._cleanup();
      m.remove();
    }
    const b = document.getElementById('agy-custom-theme-topbar-btn');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  function openImageThemePopup(anchor, initialFile) {
    if (document.getElementById('agy-theme-popup-backdrop')) { if (!initialFile) { closeQuickThemeMenu(); return; } closeQuickThemeMenu(); }
    const esc = escHtml;
    const bd = document.createElement('div');
    bd.id = 'agy-theme-popup-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.52);display:flex;align-items:center;justify-content:center;app-region:no-drag;';
    const card = document.createElement('div');
    card.setAttribute('role', 'dialog');
    card.style.cssText = 'width:min(520px,94vw);max-height:88vh;overflow:auto;padding:20px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.6);font-size:13px;';
    bd.appendChild(card);
    let waitTimer = null;
    bd._cleanup = () => { if (waitTimer) { clearInterval(waitTimer); waitTimer = null; } };

    function render(statusHtml) {
      const stState = getState();
      const cur = THEMES[stState.themeName] || THEMES[getDefaultThemeKey()] || {};
      const ink = cur.isLight ? '#0f172a' : '#f8fafc';
      const muted = cur.isLight ? '#475569' : '#94a3b8';
      const accent = cur.primary || '#38bdf8';
      card.style.background = cur.modalBg || 'rgba(10,14,24,0.97)';
      card.style.border = `1px solid ${cur.borderColor || 'rgba(255,255,255,0.15)'}`;
      card.style.color = ink;

      const customCount = THEME_KEYS.filter((k) => !BUILTIN_KEYS.has(k)).length;
      const hiddenBuiltins = loadHiddenBuiltins();
      const canDelete = THEME_KEYS.length > 1;
      const rows = THEME_KEYS.map((name) => {
        const th = THEMES[name];
        const active = name === stState.themeName;
        const isBuiltin = BUILTIN_KEYS.has(name);
        const badge = isBuiltin ? 'Gốc' : (th.isAiDesigned ? 'AI' : 'Tự tạo');
        const rowBg = active ? (cur.cardSelectedBg || 'rgba(255,255,255,0.10)') : 'rgba(128,128,128,0.06)';
        return `
          <div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:10px;border:1px solid ${active ? accent : 'rgba(128,128,128,0.25)'};background:${rowBg};">
            <button type="button" data-theme="${esc(name)}" style="flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:4px 6px;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left;">
              <span style="flex:none;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,${th.primary},${th.secondary});box-shadow:0 0 0 1px rgba(255,255,255,0.25);"></span>
              <span style="flex:1;min-width:0;display:flex;flex-direction:column;">
                <span style="display:flex;align-items:center;gap:6px;">
                  <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name)}</span>
                  <span style="flex:none;font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid rgba(128,128,128,0.3);color:${muted};">${badge}</span>
                </span>
                <span style="font-size:11px;color:${muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(th.concept || '')}</span>
              </span>
              ${active ? `<span style="flex:none;color:${accent};font-weight:700;padding-right:2px;">✓</span>` : ''}
            </button>
            ${canDelete ? `<button type="button" data-del="${esc(name)}" title="${isBuiltin ? 'Ẩn preset gốc' : 'Xóa preset'}" style="flex:none;width:28px;height:28px;border-radius:7px;border:1px solid rgba(239,68,68,0.28);background:rgba(239,68,68,0.1);color:#fca5a5;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;">🗑️</button>` : ''}
          </div>`;
      }).join('');

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:16px;font-weight:700;">Tạo theme từ ảnh</div>
          <button type="button" data-close style="border:0;background:transparent;color:inherit;font-size:18px;cursor:pointer;opacity:0.7;">✕</button>
        </div>
        <div data-drop tabindex="0" style="border:2px dashed ${accent};border-radius:14px;padding:24px 16px;text-align:center;cursor:pointer;background:${rgba(hexToRgbArr(accent), 0.08)};">
          <div style="font-size:28px;line-height:1;">🖼️</div>
          <div style="margin-top:8px;font-weight:600;">Thả ảnh vào đây, dán (Ctrl+V) hoặc bấm để chọn ảnh</div>
          <div style="opacity:0.65;margin-top:4px;">AI nhìn ảnh &amp; thiết kế trọn bộ preset (dùng quota Antigravity)</div>
          <input type="file" accept="image/*" data-file style="display:none;">
        </div>
        <div data-status style="margin-top:12px;min-height:20px;">${statusHtml || ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:14px 0 8px;">
          <div style="font-weight:600;">Theme của bạn (${THEME_KEYS.length})</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${hiddenBuiltins.length ? `<button type="button" data-restore-builtins style="border:1px solid rgba(128,128,128,0.4);background:transparent;color:inherit;border-radius:7px;padding:3px 9px;font-size:11.5px;cursor:pointer;">↺ Khôi phục gốc (${hiddenBuiltins.length})</button>` : ''}
            ${customCount ? `<button type="button" data-clear-custom style="border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.12);color:#fca5a5;border-radius:7px;padding:3px 9px;font-size:11.5px;cursor:pointer;">🗑️ Xóa tất cả tự tạo (${customCount})</button>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:2px;">${rows}</div>
        <div style="margin-top:14px;text-align:right;"><button type="button" data-studio style="border:1px solid rgba(128,128,128,0.4);background:transparent;color:inherit;border-radius:8px;padding:6px 12px;cursor:pointer;">Theme Studio…</button></div>`;

      const drop = card.querySelector('[data-drop]');
      const input = card.querySelector('[data-file]');
      drop.addEventListener('click', () => input.click());
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.background = rgba(hexToRgbArr(accent), 0.22); });
      drop.addEventListener('dragleave', () => { drop.style.background = rgba(hexToRgbArr(accent), 0.08); });
      drop.addEventListener('drop', (e) => { e.preventDefault(); handle(e.dataTransfer.files && e.dataTransfer.files[0]); });
      input.addEventListener('change', () => handle(input.files && input.files[0]));
      card.querySelector('[data-close]').addEventListener('click', closeQuickThemeMenu);
      card.querySelector('[data-studio]').addEventListener('click', () => { closeQuickThemeMenu(); window.__ANTIGRAVITY_OPEN_THEME_MODAL__(); });
      const clearBtn = card.querySelector('[data-clear-custom]');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (clearAllCustomThemes()) render('🗑️ Đã xóa tất cả preset tự tạo.');
        });
      }
      const restoreBtn = card.querySelector('[data-restore-builtins]');
      if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
          restoreBuiltinThemes();
          render('↺ Đã khôi phục các preset gốc.');
        });
      }
      card.querySelectorAll('[data-theme]').forEach((el) => el.addEventListener('click', () => {
        const name = el.getAttribute('data-theme');
        applyTheme({ themeName: name, bubbleName: name });
        render(`Đã chuyển sang <b>${esc(name)}</b>`);
      }));
      card.querySelectorAll('[data-del]').forEach((el) => {
        el.addEventListener('mouseenter', () => { el.style.background = 'rgba(239,68,68,0.85)'; el.style.color = '#fff'; });
        el.addEventListener('mouseleave', () => { el.style.background = 'rgba(239,68,68,0.1)'; el.style.color = '#fca5a5'; });
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const name = el.getAttribute('data-del');
          if (name && deletePreset(name)) {
            render(`🗑️ Đã xóa preset <b>${esc(name)}</b>`);
          }
        });
      });
    }

    async function handle(file) {
      if (!file) return;
      if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
      const started = Date.now();
      let baseMsg = 'Đang chuẩn bị ảnh…';
      const paintStatus = () => {
        const s0 = card.querySelector('[data-status]');
        if (s0) s0.innerHTML = `⏳ ${esc(baseMsg)} (${Math.floor((Date.now() - started) / 1000)}s)`;
      };
      paintStatus();
      waitTimer = setInterval(paintStatus, 1000);
      try {
        const r = await createThemeFromImageFile(file, (m) => { baseMsg = m; paintStatus(); });
        clearInterval(waitTimer); waitTimer = null;
        const sw = (c) => `<span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:${toHex(c)};border:1px solid rgba(255,255,255,0.3);"></span>`;
        const wpBadge = r.wpMeta ? ` • ${r.wpMeta.width}×${r.wpMeta.height} 4K 16:9${r.wpMeta.aiOutpainted ? ' (AI vẽ bù)' : ''}` : '';
        render(`<div style="display:flex;align-items:center;gap:12px;"><img src="${r.wallpaper}" style="width:96px;height:60px;object-fit:cover;border-radius:8px;"><div><div>✅ Đã áp dụng <b>${esc(r.name)}</b> (${r.ai ? 'AI design' : (r.pal.isLight ? 'Light' : 'Dark') + ' Glass'}${esc(wpBadge)})</div>${r.aiNote ? '<div style="margin-top:4px;opacity:0.8;">⚠️ ' + esc(r.aiNote) + '</div>' : ''}<div style="display:flex;gap:6px;margin-top:6px;">${sw(r.pal.primary)}${sw(r.pal.secondary)}${sw(r.pal.overlay)}</div></div></div>`);
      } catch (err) {
        if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
        const st2 = card.querySelector('[data-status]');
        if (st2) st2.innerHTML = `⚠️ ${esc(err.message || err)}`;
      }
    }

    function hexToRgbArr(h) {
      const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
      if (!m) return [56, 189, 248];
      const v = parseInt(m[1], 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }

    render('');
    bd.addEventListener('mousedown', (e) => { if (e.target === bd) closeQuickThemeMenu(); });
    document.body.appendChild(bd);
    anchor.setAttribute('aria-expanded', 'true');
    const onKey = (e) => {
      if (!document.getElementById('agy-theme-popup-backdrop')) { document.removeEventListener('keydown', onKey, true); document.removeEventListener('paste', onPaste, true); return; }
      if (e.key === 'Escape') closeQuickThemeMenu();
    };
    const onPaste = (e) => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const it of items) if (it.type.startsWith('image/')) { handle(it.getAsFile()); e.preventDefault(); return; }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('paste', onPaste, true);
    if (initialFile) handle(initialFile);
  }

  function isElementVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function findTopbarMountTarget() {
    const toolbar = document.querySelector('[data-testid="pane-titlebar-toolbar"]');
    if (isElementVisible(toolbar)) {
      const group = toolbar.querySelector(':scope > div') || toolbar;
      const moreBtn = group.querySelector('[data-testid="titlebar-more-actions"]');
      return { parent: group, before: moreBtn || group.firstChild, mode: 'native' };
    }
    const anchorBtn =
      document.querySelector('[data-testid="titlebar-more-actions"]') ||
      document.querySelector('[data-testid="toggle-overview-panel"]');
    if (isElementVisible(anchorBtn) && anchorBtn.parentElement) {
      return { parent: anchorBtn.parentElement, before: anchorBtn, mode: 'native' };
    }
    const ideTitlebar = document.querySelector('.part.titlebar .titlebar-right');
    if (isElementVisible(ideTitlebar)) {
      return { parent: ideTitlebar, before: ideTitlebar.firstChild, mode: 'native' };
    }
    const titlebar =
      document.querySelector('[class*="@container/titlebar"]') ||
      document.querySelector('[data-main-content-header]') ||
      document.querySelector('header');
    if (isElementVisible(titlebar)) {
      const rightGroup = titlebar.lastElementChild || titlebar;
      if (isElementVisible(rightGroup)) {
        return { parent: rightGroup, before: rightGroup.firstChild, mode: 'native' };
      }
    }
    if (document.body) {
      return { parent: document.body, before: null, mode: 'floating' };
    }
    return null;
  }

  function styleTopbarButton(btn, mode) {
    btn.dataset.agyMountMode = mode;
    if (mode === 'floating') {
      const th = THEMES[getState().themeName] || THEMES[getDefaultThemeKey()] || {};
      btn.className = 'inline-flex items-center justify-center cursor-pointer select-none outline-none';
      btn.style.cssText = `position:fixed;top:8px;right:156px;z-index:2147482000;width:28px;height:28px;border-radius:8px;app-region:no-drag;background:${th.btnBg || 'rgba(15, 23, 42, 0.72)'};border:1px solid ${th.borderColor || 'rgba(255,255,255,0.18)'};color:${th.primary || '#38bdf8'};box-shadow:0 4px 14px rgba(0,0,0,0.35);`;
    } else {
      btn.className = 'agy-button agy-button-icon-lg inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center h-7 w-7 shrink-0 rounded-lg bg-transparent text-secondary-foreground hover:text-foreground hover:bg-secondary focus-visible:text-foreground focus-visible:bg-secondary';
      btn.style.cssText = 'app-region: no-drag;';
    }
  }

  function createTopbarButton(mode) {
    const btn = document.createElement('button');
    btn.id = 'agy-custom-theme-topbar-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Custom Theme Studio');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = 'Custom Theme Studio (hoặc thả ảnh vào đây)';
    styleTopbarButton(btn, mode);
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCustomThemeModal();
    });
    const dropFile = (e) => { const f = e.dataTransfer && Array.from(e.dataTransfer.files || []).find((x) => /^image\//.test(x.type)); return f || null; };
    btn.addEventListener('dragenter', (e) => { e.preventDefault(); btn.style.boxShadow = '0 0 0 2px ' + ((THEMES[getState().themeName] || {}).primary || '#38bdf8'); });
    btn.addEventListener('dragover', (e) => { e.preventDefault(); });
    btn.addEventListener('dragleave', () => { btn.style.boxShadow = btn.dataset.agyMountMode === 'floating' ? '0 4px 14px rgba(0,0,0,0.35)' : ''; });
    btn.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); btn.style.boxShadow = btn.dataset.agyMountMode === 'floating' ? '0 4px 14px rgba(0,0,0,0.35)' : ''; const f = dropFile(e); openCustomThemeModal(f); });
    return btn;
  }

  function injectTopbarButton() {
    const target = findTopbarMountTarget();
    if (!target || !target.parent) return;

    const all = document.querySelectorAll('#agy-custom-theme-topbar-btn');
    if (all.length > 1) {
      for (let i = 1; i < all.length; i++) all[i].remove();
    }
    const existing = all[0] || null;

    if (existing && existing.isConnected) {
      const rect = existing.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      const inTarget = existing.parentElement === target.parent;
      const sameMode = existing.dataset.agyMountMode === target.mode;
      if (visible && inTarget && sameMode) return;
      styleTopbarButton(existing, target.mode);
      if (!inTarget) {
        if (target.before && target.before.parentElement === target.parent) {
          target.parent.insertBefore(existing, target.before);
        } else {
          target.parent.appendChild(existing);
        }
      }
      return;
    }

    const btn = createTopbarButton(target.mode);
    if (target.before && target.before.parentElement === target.parent) {
      target.parent.insertBefore(btn, target.before);
    } else {
      target.parent.appendChild(btn);
    }
  }

  function tick() {
    injectTopbarButton();
    injectMainSidebarButton();
    injectSettingsModalButton();
    hookSidebarScroll();
    hookShellMetrics();
  }

  function scheduleTick() {
    if (window.__AGY_TICK_RAF__) return;
    window.__AGY_TICK_RAF__ = requestAnimationFrame(() => {
      window.__AGY_TICK_RAF__ = 0;
      tick();
    });
  }

  clearTitleBarTimers();
  if (window.__AGY_TOPBAR_WATCHDOG__) {
    clearInterval(window.__AGY_TOPBAR_WATCHDOG__);
    window.__AGY_TOPBAR_WATCHDOG__ = null;
  }
  if (window.__AGY_TICK_RAF__) {
    cancelAnimationFrame(window.__AGY_TICK_RAF__);
    window.__AGY_TICK_RAF__ = 0;
  }
  if (window.__AGY_SHELL_RO__) {
    try { window.__AGY_SHELL_RO__.disconnect(); } catch (e) {}
    window.__AGY_SHELL_RO__ = null;
  }
  if (window.__AGY_SCROLL_AC__) {
    try { window.__AGY_SCROLL_AC__.abort(); } catch (e) {}
  }
  window.__AGY_SCROLL_AC__ = new AbortController();
  window.addEventListener('load', () => { scheduleTitleBarSync(); injectTopbarButton(); }, { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('focus', () => { syncTitleBarOverlay(); injectTopbarButton(); }, { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('popstate', () => scheduleTick(), { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('hashchange', () => scheduleTick(), { signal: window.__AGY_SCROLL_AC__.signal });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { syncTitleBarOverlay(); injectTopbarButton(); }
  }, { signal: window.__AGY_SCROLL_AC__.signal });
  document.querySelectorAll('[data-agy-scroll-bound]').forEach(el => delete el.dataset.agyScrollBound);
  document.querySelectorAll('[data-agy-tbo-mounted]').forEach(el => delete el.dataset.agyTboMounted);
  const staleBackdrop = document.getElementById('agy-custom-theme-modal-backdrop');
  if (staleBackdrop) staleBackdrop.remove();
  const staleTopbarBtn = document.getElementById('agy-custom-theme-topbar-btn');
  if (staleTopbarBtn) staleTopbarBtn.remove();
  const staleQuickMenu = document.getElementById('agy-theme-popup-backdrop');
  if (staleQuickMenu) staleQuickMenu.remove();
  const staleSidebarBtn = document.getElementById('agy-custom-theme-sidebar-btn');
  if (staleSidebarBtn) staleSidebarBtn.remove();
  const staleSettingsBtn = document.getElementById('agy-custom-theme-settings-btn');
  if (staleSettingsBtn) staleSettingsBtn.remove();

  window.__AGY_HOLE_EL__ = null;
  if (window.__AGY_MODAL_OBSERVER__) {
    window.__AGY_MODAL_OBSERVER__.disconnect();
  }
  window.__AGY_MODAL_OBSERVER__ = new MutationObserver(scheduleTick);
  window.__AGY_MODAL_OBSERVER__.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-has-browser-hole', 'data-browser-hole']
  });
  window.__AGY_TOPBAR_WATCHDOG__ = setInterval(() => {
    try { injectTopbarButton(); } catch (e) {}
  }, 2000);
  tick();

  return 'Antigravity Custom Theme Engine Ready!';
})();