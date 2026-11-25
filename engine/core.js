(() => {
  // Live-code version marker: verify_cdp.js reports this, so an install can
  // be proven live inside Antigravity instead of only on disk.
  window.__AGY_ENGINE_VERSION__ = 'fusion-media-1';
  const THEMES = /*__THEMES_PLACEHOLDER__*/{};
  const BOOT_ASSETS = /*__BOOT_ASSETS_PLACEHOLDER__*/{};
  const BUILD_VER = /*__BUILD_VER_PLACEHOLDER__*/"dev";
  const MEDIA_BASE = 'http://127.0.0.1:47821';
  const BUILTIN_THEMES = { ...THEMES };
  const BUILTIN_KEYS = new Set(Object.keys(BUILTIN_THEMES));
  const THEME_KEYS = Object.keys(THEMES);
  const DEFAULT_THEME_KEY = THEME_KEYS[0] || 'Default';
  const STORAGE_CUSTOM_THEMES = 'agy_custom_themes_v1';
  const STORAGE_HIDDEN_BUILTINS = 'agy_hidden_builtins_v1';

  if (window.__AGY_MOD_VER__ !== BUILD_VER) {
    window.__AGY_MOD_VER__ = BUILD_VER;
    window.__AGY_LOADED_MODS__ = {};
  }

  function loadLazyModule(name) {
    const mods = window.__AGY_LOADED_MODS__ || (window.__AGY_LOADED_MODS__ = {});
    const globalKey = `__AGY_LAZY_${name.toUpperCase()}__`;
    if (mods[name] === true && typeof window[globalKey] === 'function') {
      return Promise.resolve(window[globalKey]);
    }
    if (mods[name] && typeof mods[name].then === 'function') {
      return mods[name];
    }
    const base = (typeof window !== 'undefined' && window.__AGY_MEDIA_BASE_URL__)
      ? String(window.__AGY_MEDIA_BASE_URL__).replace(/\/+$/, '')
      : MEDIA_BASE;
    const promise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${base}/engine/${name}.js?v=${encodeURIComponent(BUILD_VER)}`;
      s.async = true;
      s.onload = () => {
        s.remove();
        mods[name] = true;
        resolve(window[globalKey]);
      };
      s.onerror = () => {
        s.remove();
        delete mods[name];
        reject(new Error(`Failed to load lazy module: ${name}`));
      };
      (document.head || document.documentElement).appendChild(s);
    });
    mods[name] = promise;
    return promise;
  }

  const STORAGE_THEME = 'agy_theme_v3';
  const STORAGE_BUBBLE = 'agy_bubble_v3';
  const STORAGE_INPUT = 'agy_input_v3';
  const STORAGE_DIMMING = 'agy_dimming_v3';
  const STORAGE_WP_ENABLED = 'agy_wp_enabled_v3';
  const STORAGE_WP_MODE = 'agy_wp_mode_v3';
  const STORAGE_CUSTOM_WP = 'agy_custom_wp_v3';
  const STORAGE_CUSTOM_VIDEO = 'agy_custom_video_v3';
  const STORAGE_SAVED_IMAGES = 'agy_saved_images_v3';
  const STORAGE_SAVED_VIDEOS = 'agy_saved_videos_v3';
  const STORAGE_TASK_VOICES = 'agy_task_voices_v3';
  const STORAGE_TASK_VOICE_ENABLED = 'agy_task_voice_enabled_v3';
  const STORAGE_TASK_VOICE_VOL = 'agy_task_voice_vol_v3';
  const STORAGE_CUSTOM_GREETINGS = 'agy_custom_greetings_v3';
  const STORAGE_USER_AVATAR = 'agy_user_avatar_v3';
  const STORAGE_AGENT_AVATAR = 'agy_agent_avatar_v3';
  const STORAGE_GLASS_BLUR = 'agy_glass_blur_v3';
  const STORAGE_AVATAR_SIZE = 'agy_avatar_size_v3';
  const STORAGE_AVATAR_RADIUS = 'agy_avatar_radius_v3';
  const STORAGE_THEME_MODE = 'agy_theme_mode_v1';
  const STORAGE_SOUND_MUTED = 'agy_sound_muted_v1';
  const STORAGE_SOUND_VOLUME = 'agy_sound_volume_v1';
  const STORAGE_VOICE_ENABLED = 'agy_voice_enabled_v1';
  const STORAGE_INTRO_ENABLED = 'agy_intro_enabled_v1';
  const STORAGE_BOOT_INTRO = 'agy_boot_intro_v1';
  const STORAGE_SKETCH_REVEAL = 'agy_sketch_reveal_v1';
  const STORAGE_TAWA_GREETING = 'agy_tawa_greeting_v1';
  const GREETING_RX = /^(?:Hey\s+[^,]{1,40},\s+what\s+should\s+we\s+build\s+today\??|Good\s+to\s+see\s+you,\s+[^.]{1,40}\.\s+What'?s\s+next\??|What\s+(?:should|are)\s+we\s+build(?:ing)?\s+today\??|Welcome\s+back[,.!\s]+[^.!?]{0,40}(?:[.!?]\s*(?:Where\s+should\s+we\s+pick\s+up|What'?s\s+next|What\s+should\s+we\s+build)[^.!?]{0,40}[.!?]?)?|Where\s+should\s+we\s+pick\s+up\??|Ready\s+(?:to\s+build|when\s+you\s+are)[,.!\s]*.*)$/i;

  const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  // ── Adaptive Dynamic Pack ─────────────────────────────────────────────────────
  const DYNAMIC_ARCHETYPES = {
    'rpg-fantasy': {
      archetype: 'rpg-fantasy',
      archetypeLabel: 'RPG Fantasy',
      particleStyle: 'crystals',
      hudRingStyle: 'magic-circle',
      soundProfile: 'crystalline',
      introTitle: 'AETHER SYSTEM // LINK START',
      introSubtitle: 'ARCANE MATRIX SYNCHRONIZED',
      introChecks: ['VISUAL', 'AUDIO', 'AETHER', 'SYNC'],
      voiceWelcome: 'System online. Link start.',
      voiceSwitch: 'World synchronized.'
    },
    'anime-celestial': {
      archetype: 'anime-celestial',
      archetypeLabel: 'Anime Celestial',
      particleStyle: 'petals',
      hudRingStyle: 'orbital-halo',
      soundProfile: 'crystalline',
      introTitle: 'CELESTIAL LINK // AWAKENED',
      introSubtitle: 'STARLIGHT HARMONICS 100%',
      introChecks: ['VISUAL', 'STARLIGHT', 'AUDIO', 'SYNC'],
      voiceWelcome: 'Celestial link awakened. Welcome back.',
      voiceSwitch: 'Celestial theme active.'
    },
    'cyberpunk-sci-fi': {
      archetype: 'cyberpunk-sci-fi',
      archetypeLabel: 'Cyberpunk HUD',
      particleStyle: 'sparks',
      hudRingStyle: 'cyber-radar',
      soundProfile: 'synth-chime',
      introTitle: 'NEURAL HUD // ONLINE',
      introSubtitle: 'BIOMETRIC SYNC 100%',
      introChecks: ['OPTICS', 'NEURAL', 'AUDIO', 'UPLINK'],
      voiceWelcome: 'Neural HUD online. Welcome back.',
      voiceSwitch: 'System profile loaded.'
    },
    'kaiju-mecha': {
      archetype: 'kaiju-mecha',
      archetypeLabel: 'Kaiju Mecha',
      particleStyle: 'embers',
      hudRingStyle: 'cyber-radar',
      soundProfile: 'power-chord',
      introTitle: 'CORE REACTOR // IGNITION',
      introSubtitle: 'ARMOR & THRUSTERS NOMINAL',
      introChecks: ['REACTOR', 'RADAR', 'WEAPONS', 'SYNC'],
      voiceWelcome: 'Core reactor online. Standing by.',
      voiceSwitch: 'Combat profile engaged.'
    },
    'minimal-office': {
      archetype: 'minimal-office',
      archetypeLabel: 'Minimal Office',
      particleStyle: 'grid-dots',
      hudRingStyle: 'minimal-arc',
      soundProfile: 'warm-bell',
      introTitle: 'FOCUS WORKSPACE // ONLINE',
      introSubtitle: 'AMBIENT DESK READY',
      introChecks: ['LAYOUT', 'CONTRAST', 'AUDIO', 'READY'],
      voiceWelcome: 'Focus workspace ready. Welcome back.',
      voiceSwitch: 'Workspace updated.'
    },
    'nature-zen': {
      archetype: 'nature-zen',
      archetypeLabel: 'Nature Zen',
      particleStyle: 'leaves',
      hudRingStyle: 'minimal-arc',
      soundProfile: 'warm-bell',
      introTitle: 'SANCTUARY // BREATHE IN',
      introSubtitle: 'AMBIENT HARMONY RESTORED',
      introChecks: ['CANOPY', 'BREEZE', 'CHIME', 'CALM'],
      voiceWelcome: 'Sanctuary ready. Breathe and focus.',
      voiceSwitch: 'Ambient scene active.'
    },
    'retro-arcade': {
      archetype: 'retro-arcade',
      archetypeLabel: 'Retro Arcade',
      particleStyle: 'grid-dots',
      hudRingStyle: 'pixel-frame',
      soundProfile: 'retro-blip',
      introTitle: 'PLAYER 1 // PRESS START',
      introSubtitle: '8-BIT ENGINE READY',
      introChecks: ['SPRITES', 'CHIPTUNE', 'CRT', 'READY'],
      voiceWelcome: 'Player one ready. Press start.',
      voiceSwitch: 'Stage selected.'
    },
    'cosmic-arcane': {
      archetype: 'cosmic-arcane',
      archetypeLabel: 'Cosmic Arcane',
      particleStyle: 'stars',
      hudRingStyle: 'orbital-halo',
      soundProfile: 'synth-chime',
      introTitle: 'ASTRAL OBSERVATORY // SYNC',
      introSubtitle: 'NEBULA TELEMETRY LOCKED',
      introChecks: ['NEBULA', 'ORBIT', 'SONIC', 'LOCK'],
      voiceWelcome: 'Astral observatory online. Welcome back.',
      voiceSwitch: 'Cosmic alignment complete.'
    }
  };

  function inferArchetypeFromTheme(theme) {
    const t = theme || {};
    const hay = `${t.name || ''} ${t.concept || ''} ${t.primary || ''}`.toLowerCase();
    if (/kaiju|mecha|titan|crimson|lava|ember|magma|dragon/.test(hay)) return 'kaiju-mecha';
    if (/cyber|neon|matrix|sci-fi|tech|synth|radar|hud/.test(hay)) return 'cyberpunk-sci-fi';
    if (/office|minimal|obsidian|clean|desk|slate|monochrome/.test(hay)) return 'minimal-office';
    if (/nature|forest|grotto|luminous|zen|garden|leaf|moss|emerald/.test(hay)) return 'nature-zen';
    if (/retro|pixel|arcade|8-bit|8bit|chiptune/.test(hay)) return 'retro-arcade';
    if (/anime|celestial|sakura|eclipse|petal|angel|halo/.test(hay)) return 'anime-celestial';
    if (/rpg|fantasy|sword|knight|dungeon|guild|aether/.test(hay)) return 'rpg-fantasy';
    return 'cosmic-arcane';
  }

  const ALLOWED_SVG_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'g']);
  registerCustomThemes();

  function sanitizeSvgFragment(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let s = raw
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
    return s.trim();
  }

  function getFontVibeStack(fontVibe) {
    if (fontVibe === 'mono') return 'ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace';
    if (fontVibe === 'serif') return 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif';
    if (fontVibe === 'display') return '"Orbitron", "Rajdhani", "Segoe UI", system-ui, sans-serif';
    return 'system-ui, -apple-system, "Segoe UI", sans-serif';
  }

  function resolveDynamicPack(theme) {
    const t = theme || {};
    const raw = (t.dynamicPack && typeof t.dynamicPack === 'object') ? t.dynamicPack : {};
    const rawArch = typeof raw.archetype === 'string' ? raw.archetype.trim() : '';
    const fallbackArch = inferArchetypeFromTheme(t);
    const archKey = rawArch || fallbackArch;
    const base = DYNAMIC_ARCHETYPES[archKey] || DYNAMIC_ARCHETYPES[fallbackArch] || DYNAMIC_ARCHETYPES['cosmic-arcane'];
    const checks = Array.isArray(raw.introChecks) && raw.introChecks.length
      ? raw.introChecks.slice(0, 4).map(c => String(c).toUpperCase())
      : base.introChecks;

    const rawUi = (raw.uiDesign && typeof raw.uiDesign === 'object') ? raw.uiDesign : {};
    const cardRadiusPx = Number.isFinite(Number(rawUi.cardRadiusPx))
      ? Math.min(28, Math.max(0, Math.round(Number(rawUi.cardRadiusPx))))
      : 14;
    const borderStyle = ['double', 'dashed', 'glow-frame', 'chamfered', 'solid'].includes(rawUi.borderStyle)
      ? rawUi.borderStyle
      : 'solid';
    const fontVibe = ['mono', 'serif', 'display', 'sans'].includes(rawUi.fontVibe)
      ? rawUi.fontVibe
      : 'sans';
    const accentGlowIntensity = Number.isFinite(Number(rawUi.accentGlowIntensity))
      ? Math.min(2, Math.max(0, Number(rawUi.accentGlowIntensity)))
      : 1;

    const layoutFallback = (() => {
      if (archKey === 'cyber-hud' || archKey === 'mecha-tactical' || archKey === 'neon-synth') {
        return {
          layoutPreset: 'tactical-hud',
          sidebarStyle: 'framed-panel',
          composerStyle: 'hud-console',
          chatCardLayout: 'hud-panel',
          dockPosition: 'right-vertical',
          dockShape: 'hex'
        };
      }
      if (archKey === 'crimson-blade' || archKey === 'ember-forge') {
        return {
          layoutPreset: 'blade-terminal',
          sidebarStyle: 'framed-panel',
          composerStyle: 'command-bar',
          chatCardLayout: 'terminal-block',
          dockPosition: 'top-right',
          dockShape: 'square'
        };
      }
      if (archKey === 'nature-zen' || archKey === 'pastel-dream') {
        return {
          layoutPreset: 'floating-atelier',
          sidebarStyle: 'sleek-rail',
          composerStyle: 'floating-dock',
          chatCardLayout: 'floating-bubble',
          dockPosition: 'bottom-right',
          dockShape: 'pill'
        };
      }
      if (archKey === 'cosmic-arcane' || archKey === 'gothic-nocturne') {
        return {
          layoutPreset: 'astral-sanctum',
          sidebarStyle: 'floating-cards',
          composerStyle: 'floating-dock',
          chatCardLayout: 'hud-panel',
          dockPosition: 'right-vertical',
          dockShape: 'circle'
        };
      }
      return {
        layoutPreset: 'adaptive-studio',
        sidebarStyle: 'floating-cards',
        composerStyle: 'floating-dock',
        chatCardLayout: 'clean-sheet',
        dockPosition: 'right-vertical',
        dockShape: 'circle'
      };
    })();

    const layoutPreset = (typeof rawUi.layoutPreset === 'string' && rawUi.layoutPreset.trim())
      ? rawUi.layoutPreset.trim().slice(0, 36)
      : layoutFallback.layoutPreset;
    const sidebarStyle = ['floating-cards', 'sleek-rail', 'framed-panel'].includes(rawUi.sidebarStyle)
      ? rawUi.sidebarStyle
      : layoutFallback.sidebarStyle;
    const composerStyle = ['floating-dock', 'command-bar', 'hud-console'].includes(rawUi.composerStyle)
      ? rawUi.composerStyle
      : layoutFallback.composerStyle;
    const chatCardLayout = ['hud-panel', 'clean-sheet', 'terminal-block', 'floating-bubble'].includes(rawUi.chatCardLayout)
      ? rawUi.chatCardLayout
      : layoutFallback.chatCardLayout;
    const dockPosition = ['right-vertical', 'bottom-right', 'top-right'].includes(rawUi.dockPosition)
      ? rawUi.dockPosition
      : layoutFallback.dockPosition;
    const dockShape = ['circle', 'hex', 'pill', 'square'].includes(rawUi.dockShape)
      ? rawUi.dockShape
      : layoutFallback.dockShape;

    const defaultLabel = rawArch
      ? rawArch.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : base.archetypeLabel;
    const resolvedArchetypeLabel = raw.archetypeLabel || (DYNAMIC_ARCHETYPES[archKey] ? DYNAMIC_ARCHETYPES[archKey].archetypeLabel : defaultLabel);
    const rawHudWidget = (rawUi.hudWidget && typeof rawUi.hudWidget === 'object') ? rawUi.hudWidget : {};
    const hudWidget = {
      badge: (typeof rawHudWidget.badge === 'string' && rawHudWidget.badge.trim())
        ? rawHudWidget.badge.trim().slice(0, 18)
        : archKey.toUpperCase().slice(0, 14),
      title: (typeof rawHudWidget.title === 'string' && rawHudWidget.title.trim())
        ? rawHudWidget.title.trim().slice(0, 28)
        : (raw.introTitle || base.introTitle || resolvedArchetypeLabel).toUpperCase().slice(0, 26),
      subtitle: (typeof rawHudWidget.subtitle === 'string' && rawHudWidget.subtitle.trim())
        ? rawHudWidget.subtitle.trim().slice(0, 32)
        : resolvedArchetypeLabel.toUpperCase().slice(0, 28),
      statusText: (typeof rawHudWidget.statusText === 'string' && rawHudWidget.statusText.trim())
        ? rawHudWidget.statusText.trim().slice(0, 24)
        : 'SYNC 100%'
    };
    const topBarPillText = (typeof rawUi.topBarPillText === 'string' && rawUi.topBarPillText.trim())
      ? rawUi.topBarPillText.trim().toUpperCase().slice(0, 36)
      : `${resolvedArchetypeLabel.toUpperCase().slice(0, 16)} // ${layoutPreset.toUpperCase().slice(0, 16)}`;

    const rawSynth = (raw.soundSynth && typeof raw.soundSynth === 'object') ? raw.soundSynth : null;
    const synthNotes = rawSynth && Array.isArray(rawSynth.notes)
      ? rawSynth.notes.map(Number).filter(n => Number.isFinite(n) && n >= 20 && n <= 8000).slice(0, 12)
      : [];
    const soundSynth = synthNotes.length > 0 ? {
      waveform: ['sine', 'triangle', 'square', 'sawtooth'].includes(rawSynth.waveform) ? rawSynth.waveform : 'sine',
      notes: synthNotes,
      noteStepMs: Number.isFinite(Number(rawSynth.noteStepMs)) ? Math.min(600, Math.max(15, Number(rawSynth.noteStepMs))) : 65,
      decayMs: Number.isFinite(Number(rawSynth.decayMs)) ? Math.min(2000, Math.max(20, Number(rawSynth.decayMs))) : 180
    } : null;

    const particleShape = typeof raw.particleShape === 'string' ? raw.particleShape.trim() : '';
    const particleSvgInner = sanitizeSvgFragment(raw.particleSvgInner || '');
    const particleMotion = typeof raw.particleMotion === 'string' ? raw.particleMotion.trim().toLowerCase() : '';
    const particleCount = Number.isFinite(Number(raw.particleCount))
      ? Math.min(36, Math.max(0, Math.round(Number(raw.particleCount))))
      : 11;
    const hudSvgInner = sanitizeSvgFragment(raw.hudSvgInner || '');

    const voicePitch = Number.isFinite(Number(raw.voicePitch))
      ? Math.min(2, Math.max(0.5, Number(raw.voicePitch)))
      : 1;
    const voiceRate = Number.isFinite(Number(raw.voiceRate))
      ? Math.min(2, Math.max(0.5, Number(raw.voiceRate)))
      : 1.03;

    return {
      archetype: archKey,
      archetypeLabel: resolvedArchetypeLabel,
      particleStyle: raw.particleStyle || base.particleStyle,
      particleShape,
      particleSvgInner,
      particleMotion,
      particleCount,
      hudRingStyle: raw.hudRingStyle || base.hudRingStyle,
      hudSvgInner,
      soundProfile: raw.soundProfile || base.soundProfile,
      soundSynth,
      voicePitch,
      voiceRate,
      uiDesign: {
        fontVibe,
        cardRadiusPx,
        borderStyle,
        accentGlowIntensity,
        layoutPreset,
        sidebarStyle,
        composerStyle,
        chatCardLayout,
        dockPosition,
        dockShape,
        hudWidget,
        topBarPillText
      },
      introTitle: raw.introTitle || base.introTitle,
      introSubtitle: raw.introSubtitle || base.introSubtitle,
      introChecks: checks,
      voiceWelcome: raw.voiceWelcome || base.voiceWelcome,
      voiceSwitch: raw.voiceSwitch || base.voiceSwitch
    };
  }

  // ── Sound & Voice Engine ──────────────────────────────────────────────────────
  // Synthesises genre-tuned UI sounds using Web Audio API & optional Web Speech.
  // All sounds & speech are Dynamic-mode only and respect mute/volume/voice state.
  let _agySoundCtx = null;
  function getAudioCtx() {
    if (!_agySoundCtx || _agySoundCtx.state === 'closed') {
      try { _agySoundCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    if (_agySoundCtx && _agySoundCtx.state === 'suspended') {
      try { _agySoundCtx.resume(); } catch (_) {}
    }
    return _agySoundCtx;
  }

  function getSoundVolume() {
    const rawMuted = localStorage.getItem(STORAGE_SOUND_MUTED);
    const isMuted = rawMuted === 'true';
    if (isMuted) return 0;
    const rawVol = localStorage.getItem(STORAGE_SOUND_VOLUME);
    return rawVol !== null ? Math.min(1, Math.max(0, parseFloat(rawVol))) : 0.38;
  }

  function isSoundEnabled() {
    const st = getStateSafe();
    return st.themeMode !== 'static' && getSoundVolume() > 0;
  }

  function getStateSafe() {
    try { return getState(); } catch (_) { return { themeMode: 'dynamic', voiceEnabled: true, introEnabled: true }; }
  }

  function playTone(freq, type, duration, vol, attackT, decayT) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const v = (vol !== undefined ? vol : 1) * getSoundVolume();
    if (v <= 0) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const att = attackT || 0.01;
      const dec = decayT || duration * 0.7;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(v, ctx.currentTime + att);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + att + dec);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  function resolvePackFromArg(themeOrPack) {
    if (themeOrPack && typeof themeOrPack === 'object' && ('soundSynth' in themeOrPack || 'voicePitch' in themeOrPack || 'uiDesign' in themeOrPack)) {
      return themeOrPack;
    }
    const th = (themeOrPack && typeof themeOrPack === 'object')
      ? themeOrPack
      : (THEMES[getStateSafe().themeName] || THEMES[getDefaultThemeKey()] || {});
    return resolveDynamicPack(th);
  }

  function getActiveSoundProfile(themeOrPack) {
    if (themeOrPack && themeOrPack.soundProfile) return themeOrPack.soundProfile;
    return resolvePackFromArg(themeOrPack).soundProfile;
  }

  // Genre-tuned theme selection chime
  function playThemeSelectSound(primaryColor, themeOrPack) {
    if (!isSoundEnabled()) return;
    const pack = resolvePackFromArg(themeOrPack);
    if (pack.soundSynth && Array.isArray(pack.soundSynth.notes) && pack.soundSynth.notes.length > 0) {
      const synth = pack.soundSynth;
      const wave = synth.waveform || 'sine';
      const stepMs = synth.noteStepMs || 65;
      const decaySec = (synth.decayMs || 180) / 1000;
      const durSec = Math.max(0.06, decaySec + 0.04);
      const volScale = wave === 'square' ? 0.28 : (wave === 'sawtooth' ? 0.25 : 0.45);
      synth.notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, wave, durSec, volScale, 0.008, decaySec), idx * stepMs);
      });
      return;
    }
    let baseFreq = 440;
    try {
      const hex = (primaryColor || '#38bdf8').replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      baseFreq = 300 + (r * 0.4 + g * 0.3) % 220;
    } catch (_) {}
    const profile = getActiveSoundProfile(pack);
    if (profile === 'retro-blip') {
      [1, 1.25, 1.5, 2.0].forEach((mult, idx) => {
        setTimeout(() => playTone(baseFreq * mult, 'square', 0.09, 0.28, 0.004, 0.07), idx * 45);
      });
    } else if (profile === 'power-chord') {
      [0.5, 0.75, 1.0].forEach((mult, idx) => {
        setTimeout(() => playTone(baseFreq * mult, idx === 0 ? 'sawtooth' : 'triangle', 0.24, idx === 0 ? 0.25 : 0.45, 0.01, 0.2), idx * 55);
      });
    } else if (profile === 'synth-chime') {
      [1, 1.333, 1.5, 1.78].forEach((mult, idx) => {
        setTimeout(() => playTone(baseFreq * mult, idx % 2 === 0 ? 'triangle' : 'sine', 0.2, 0.45, 0.008, 0.16), idx * 60);
      });
    } else if (profile === 'warm-bell') {
      [1, 1.125, 1.5].forEach((mult, idx) => {
        setTimeout(() => playTone(baseFreq * mult, 'sine', 0.28, 0.42, 0.018, 0.24), idx * 95);
      });
    } else {
      // crystalline
      [1, 1.26, 1.5, 2.0].forEach((mult, idx) => {
        setTimeout(() => playTone(baseFreq * mult, 'sine', 0.2, 0.48, 0.008, 0.16), idx * 65);
      });
    }
  }

  // Soft click: played on UI toggle interactions (mute, voice, intro)
  function playClickSound(themeOrPack) {
    if (!isSoundEnabled()) return;
    const pack = resolvePackFromArg(themeOrPack);
    if (pack.soundSynth && Array.isArray(pack.soundSynth.notes) && pack.soundSynth.notes.length > 0) {
      const synth = pack.soundSynth;
      const wave = synth.waveform || 'sine';
      const notes = synth.notes;
      const f1 = notes[0];
      const f2 = notes.length > 1 ? notes[notes.length - 1] : Math.min(2400, f1 * 1.25);
      const gain = wave === 'square' ? 0.18 : 0.28;
      playTone(f1, wave, 0.07, gain, 0.004, 0.055);
      setTimeout(() => playTone(f2, wave, 0.06, gain * 0.75, 0.004, 0.045), 34);
      return;
    }
    const profile = getActiveSoundProfile(pack);
    if (profile === 'retro-blip') {
      playTone(960, 'square', 0.06, 0.18, 0.003, 0.05);
      setTimeout(() => playTone(1280, 'square', 0.06, 0.14, 0.003, 0.045), 32);
    } else if (profile === 'power-chord') {
      playTone(330, 'triangle', 0.1, 0.32, 0.005, 0.08);
      setTimeout(() => playTone(495, 'triangle', 0.09, 0.22, 0.005, 0.07), 35);
    } else if (profile === 'warm-bell') {
      playTone(660, 'sine', 0.12, 0.26, 0.01, 0.1);
    } else {
      playTone(880, 'sine', 0.09, 0.3, 0.005, 0.07);
      setTimeout(() => playTone(660, 'triangle', 0.07, 0.18, 0.005, 0.055), 35);
    }
  }

  // Mode switch chime: quick double-tap indicating Dynamic ↔ Static transition
  function playModeToggleSound(isDynamic, themeOrPack) {
    const vol = getSoundVolume();
    if (vol <= 0) return;
    const pack = resolvePackFromArg(themeOrPack);
    if (pack.soundSynth && Array.isArray(pack.soundSynth.notes) && pack.soundSynth.notes.length > 0) {
      const synth = pack.soundSynth;
      const wave = synth.waveform || 'sine';
      const gainScale = wave === 'square' ? 0.3 : 0.58;
      const notes = synth.notes;
      const low = notes[0];
      const high = notes[notes.length - 1] !== low ? notes[notes.length - 1] : Math.min(2400, low * 1.25);
      if (isDynamic) {
        playTone(low, wave, 0.14, vol * gainScale, 0.01, 0.11);
        setTimeout(() => playTone(high, wave, 0.18, vol * (gainScale + 0.08), 0.01, 0.14), 75);
      } else {
        playTone(high, wave, 0.1, vol * (gainScale * 0.85), 0.01, 0.08);
        setTimeout(() => playTone(low, wave, 0.15, vol * (gainScale * 0.75), 0.01, 0.12), 70);
      }
      return;
    }
    const profile = getActiveSoundProfile(pack);
    const wave = profile === 'retro-blip' ? 'square' : (profile === 'synth-chime' || profile === 'power-chord' ? 'triangle' : 'sine');
    const gainScale = wave === 'square' ? 0.3 : 0.6;
    if (isDynamic) {
      playTone(523, wave, 0.15, vol * gainScale, 0.01, 0.12);
      setTimeout(() => playTone(659, wave, 0.18, vol * (gainScale + 0.1), 0.01, 0.14), 80);
    } else {
      playTone(659, wave, 0.1, vol * (gainScale * 0.85), 0.01, 0.08);
      setTimeout(() => playTone(392, wave, 0.15, vol * (gainScale * 0.75), 0.01, 0.12), 70);
    }
  }

  // Optional Web Speech API voice feedback (Dynamic mode + voiceEnabled + unmuted)
  let _agyTechVoiceCache = null;
  let _agyTechVoiceHooked = false;
  let _agySpeechSeqId = 0;

  function pickTechVoice() {
    try {
      if (!window.speechSynthesis || typeof window.speechSynthesis.getVoices !== 'function') return null;
      if (!_agyTechVoiceHooked && 'onvoiceschanged' in window.speechSynthesis) {
        _agyTechVoiceHooked = true;
        window.speechSynthesis.onvoiceschanged = () => { _agyTechVoiceCache = null; };
      }
      if (_agyTechVoiceCache) return _agyTechVoiceCache;
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return null;

      const priorities = [
        'aria',
        'jenny',
        'guy',
        'sonya',
        'google us english',
        'microsoft zira',
        'samantha'
      ];
      for (const kw of priorities) {
        const hit = voices.find((v) => (v.name || '').toLowerCase().includes(kw));
        if (hit) {
          _agyTechVoiceCache = hit;
          return hit;
        }
      }
      const naturalEn = voices.find((v) =>
        /^en[-_](us|gb)/i.test(v.lang || '') && /(natural|online)/i.test(v.name || '')
      );
      if (naturalEn) {
        _agyTechVoiceCache = naturalEn;
        return naturalEn;
      }
      const fallbackEn = voices.find((v) => /^en\b/i.test(v.lang || ''));
      _agyTechVoiceCache = fallbackEn || null;
      return _agyTechVoiceCache;
    } catch (_) {
      return null;
    }
  }

  function playVoiceTelemetry(kind) {
    if (!isSoundEnabled()) return;
    if (kind === 'open') {
      playTone(1320, 'sine', 0.045, 0.26, 0.004, 0.036);
      setTimeout(() => playTone(1760, 'triangle', 0.055, 0.28, 0.004, 0.044), 48);
    } else if (kind === 'close') {
      playTone(980, 'sine', 0.05, 0.22, 0.004, 0.04);
    }
  }

  function speakSystemSequence(lines, themeOrPack, opts) {
    const rawList = Array.isArray(lines) ? lines : [lines];
    const segments = [];
    for (const item of rawList) {
      if (!item) continue;
      const parts = String(item).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      segments.push(...parts);
    }
    if (!segments.length) return;

    const st = getStateSafe();
    if (st.themeMode === 'static' || st.soundMuted || !st.voiceEnabled) return;
    const vol = getSoundVolume();
    if (vol <= 0) return;

    const pack = resolvePackFromArg(themeOrPack);
    try {
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;
      const seqId = ++_agySpeechSeqId;
      window.speechSynthesis.cancel();

      const voice = pickTechVoice();
      const basePitch = Number.isFinite(pack.voicePitch) ? pack.voicePitch : 1.02;
      const baseRate = Number.isFinite(pack.voiceRate) ? pack.voiceRate : 1.06;
      const clampedPitch = Math.min(1.10, Math.max(0.95, basePitch));
      const clampedRate = Math.min(1.14, Math.max(1.02, baseRate));
      const volScale = (opts && Number.isFinite(opts.volumeScale)) ? opts.volumeScale : 1;
      const utterVol = Math.min(1, Math.max(0, vol * volScale));

      const speakAt = (idx) => {
        if (seqId !== _agySpeechSeqId) return;
        if (idx >= segments.length) {
          playVoiceTelemetry('close');
          return;
        }
        const utter = new SpeechSynthesisUtterance(segments[idx]);
        utter.volume = utterVol;
        utter.pitch = clampedPitch;
        utter.rate = clampedRate;
        utter.lang = (voice && voice.lang) ? voice.lang : 'en-US';
        if (voice) utter.voice = voice;
        utter.onend = () => {
          if (seqId !== _agySpeechSeqId) return;
          if (idx + 1 < segments.length) {
            setTimeout(() => speakAt(idx + 1), 65);
          } else {
            playVoiceTelemetry('close');
          }
        };
        utter.onerror = () => { /* ignore aborted/error speech */ };
        window.speechSynthesis.speak(utter);
      };

      playVoiceTelemetry('open');
      setTimeout(() => speakAt(0), 95);
    } catch (_) {}
  }

  function speakThemeVoice(text, themeOrPack, opts) {
    if (!text) return;
    speakSystemSequence([text], themeOrPack, opts);
  }
  // ─────────────────────────────────────────────────────────────────────────────

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

  function resolveMediaUrl(relOrAbs) {
    if (!relOrAbs) return '';
    const s = String(relOrAbs).trim();
    if (!s) return '';
    const base = (typeof window !== 'undefined' && window.__AGY_MEDIA_BASE_URL__)
      ? String(window.__AGY_MEDIA_BASE_URL__).replace(/\/+$/, '')
      : MEDIA_BASE;
    const localMediaMatch = s.match(/^https?:\/\/127\.0\.0\.1:\d+\/((?:assets|user_media)\/.+)$/i);
    if (localMediaMatch) {
      return `${base}/${localMediaMatch[1]}`;
    }
    if (/^(https?:|data:|blob:|file:)/i.test(s)) return s;
    const cleanRel = s.replace(/^\.\//, '').replace(/^\/+/, '');
    return `${base}/${cleanRel}`;
  }

  function sanitizeCssUrl(u) {
    return String(u || '').replace(/["\\()\r\n]/g, (ch) => encodeURIComponent(ch));
  }

  function findActiveShell() {
    const shells = document.querySelectorAll('.agy-shell');
    if (shells.length <= 1) return shells[0] || null;
    for (let i = 0; i < shells.length; i++) {
      const r = shells[i].getBoundingClientRect();
      if (r.width > 120 && r.height > 120) return shells[i];
    }
    return shells[0] || null;
  }

  function canonicalMediaKey(urlStr) {
    if (!urlStr) return '';
    const s = String(urlStr).trim();
    if (!s) return '';
    const match = s.match(/(?:^|\/)(user_media\/[^?#]+)/i);
    if (match) {
      try {
        return 'user_media/' + decodeURIComponent(match[1].slice('user_media/'.length));
      } catch (e) {
        return match[1];
      }
    }
    return s;
  }

  function isSameMediaUrl(a, b) {
    const ka = canonicalMediaKey(a);
    const kb = canonicalMediaKey(b);
    return Boolean(ka && kb && ka === kb);
  }

  function deriveMediaName(urlStr, fallback = 'Media') {
    const s = String(urlStr || '').trim();
    if (!s) return fallback;
    if (s.startsWith('data:')) return fallback;
    const clean = s.split('#')[0].split('?')[0];
    const seg = clean.split('/').pop() || '';
    try {
      return decodeURIComponent(seg) || fallback;
    } catch (e) {
      return seg || fallback;
    }
  }

  function normalizeSavedMediaList(rawList, fallbackLabel) {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set();
    const out = [];
    for (const item of rawList) {
      const url = typeof item === 'string' ? item : (item && item.url ? String(item.url) : '');
      const key = canonicalMediaKey(url);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        url,
        name: (item && item.name && String(item.name).trim()) || deriveMediaName(url, fallbackLabel),
        addedAt: (item && Number.isFinite(Number(item.addedAt))) ? Number(item.addedAt) : 0
      });
    }
    return out;
  }

  function readStoredMediaList(storageKey, initList, fallbackLabel) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        return normalizeSavedMediaList(JSON.parse(raw), fallbackLabel);
      }
    } catch (e) {}
    return normalizeSavedMediaList(initList, fallbackLabel);
  }

  function mediaKindMeta(kind) {
    if (kind === 'video') {
      return {
        bucket: 'videos',
        storageKey: STORAGE_SAVED_VIDEOS,
        initListKey: 'savedVideos',
        activeStorageKey: STORAGE_CUSTOM_VIDEO,
        activeInitKey: 'customVideo',
        fallbackLabel: 'Custom Video'
      };
    }
    if (kind === 'audio') {
      return {
        bucket: 'audios',
        storageKey: STORAGE_TASK_VOICES,
        initListKey: 'taskVoices',
        activeStorageKey: '',
        activeInitKey: '',
        fallbackLabel: 'Task Voice'
      };
    }
    return {
      bucket: 'images',
      storageKey: STORAGE_SAVED_IMAGES,
      initListKey: 'savedImages',
      activeStorageKey: STORAGE_CUSTOM_WP,
      activeInitKey: 'customWp',
      fallbackLabel: 'Custom Image'
    };
  }

  function getMediaLibrary(kind, initOverride, activeCustomOverride) {
    const meta = mediaKindMeta(kind);
    const init = initOverride || window.__AGY_INITIAL_CONFIG__ || {};
    const stored = readStoredMediaList(meta.storageKey, init[meta.initListKey], meta.fallbackLabel);
    const serverMedia = window.__AGY_USER_MEDIA__;
    const hasServerList = Boolean(serverMedia && Array.isArray(serverMedia[meta.bucket]));
    const diskList = hasServerList ? normalizeSavedMediaList(serverMedia[meta.bucket], meta.fallbackLabel) : [];
    const byKey = new Map();
    if (hasServerList) {
      const diskByKey = new Map();
      diskList.forEach((it) => diskByKey.set(canonicalMediaKey(it.url), it));
      stored.forEach((it) => {
        const key = canonicalMediaKey(it.url);
        if (key.startsWith('user_media/')) {
          const diskMatch = diskByKey.get(key);
          if (diskMatch) {
            byKey.set(key, {
              url: diskMatch.url,
              name: it.name || diskMatch.name,
              addedAt: Math.max(it.addedAt || 0, diskMatch.addedAt || 0)
            });
          }
        } else {
          byKey.set(key, it);
        }
      });
      diskList.forEach((it) => {
        const key = canonicalMediaKey(it.url);
        if (!byKey.has(key)) byKey.set(key, it);
      });
    } else {
      stored.forEach((it) => byKey.set(canonicalMediaKey(it.url), it));
    }
    const activeUrl = activeCustomOverride !== undefined
      ? activeCustomOverride
      : (meta.activeStorageKey ? (localStorage.getItem(meta.activeStorageKey) ?? init[meta.activeInitKey] ?? '') : '');
    if (activeUrl) {
      const activeKey = canonicalMediaKey(activeUrl);
      if (activeKey && !byKey.has(activeKey)) {
        if (!hasServerList || !activeKey.startsWith('user_media/')) {
          byKey.set(activeKey, {
            url: activeUrl,
            name: deriveMediaName(activeUrl, meta.fallbackLabel),
            addedAt: Date.now()
          });
        }
      }
    }
    return Array.from(byKey.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function upsertSavedMedia(kind, item) {
    if (!item || !item.url) return getMediaLibrary(kind);
    const meta = mediaKindMeta(kind);
    const current = getMediaLibrary(kind);
    const key = canonicalMediaKey(item.url);
    const filtered = current.filter((it) => canonicalMediaKey(it.url) !== key);
    const nextItem = {
      url: item.url,
      name: (item.name && String(item.name).trim()) || deriveMediaName(item.url, meta.fallbackLabel),
      addedAt: item.addedAt || Date.now()
    };
    const next = [nextItem, ...filtered];
    try {
      localStorage.setItem(meta.storageKey, JSON.stringify(next));
    } catch (e) {}
    if (window.__AGY_USER_MEDIA__ && key.startsWith('user_media/')) {
      const arr = Array.isArray(window.__AGY_USER_MEDIA__[meta.bucket]) ? window.__AGY_USER_MEDIA__[meta.bucket] : [];
      window.__AGY_USER_MEDIA__[meta.bucket] = [nextItem, ...arr.filter((it) => canonicalMediaKey(it.url) !== key)];
    }
    return next;
  }

  function removeSavedMediaFromStore(kind, url) {
    const meta = mediaKindMeta(kind);
    const key = canonicalMediaKey(url);
    const next = getMediaLibrary(kind).filter((it) => canonicalMediaKey(it.url) !== key);
    try {
      localStorage.setItem(meta.storageKey, JSON.stringify(next));
    } catch (e) {}
    if (window.__AGY_USER_MEDIA__ && Array.isArray(window.__AGY_USER_MEDIA__[meta.bucket])) {
      window.__AGY_USER_MEDIA__[meta.bucket] = window.__AGY_USER_MEDIA__[meta.bucket].filter((it) => canonicalMediaKey(it.url) !== key);
    }
    return next;
  }

  function normalizeGreetingLines(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    for (const item of list) {
      const s = String(item || '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }

  function readCustomGreetings(initOverride) {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_GREETINGS);
      if (raw !== null) {
        return normalizeGreetingLines(JSON.parse(raw));
      }
    } catch (e) {}
    const init = initOverride || window.__AGY_INITIAL_CONFIG__ || {};
    return normalizeGreetingLines(init.customGreetings);
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
    const activeThObj = THEMES[themeName] || THEMES[defKey] || {};
    const storedMode = localStorage.getItem(STORAGE_WP_MODE);
    const wpMode = (storedMode === 'video' || storedMode === 'image')
      ? storedMode
      : ((init.wpMode === 'video' || init.wpMode === 'image') ? init.wpMode : (activeThObj.wallpaperVideo ? 'video' : 'image'));
    const rawCustomWp = localStorage.getItem(STORAGE_CUSTOM_WP);
    const customWp = rawCustomWp !== null ? rawCustomWp : (init.customWp || '');
    const rawCustomVid = localStorage.getItem(STORAGE_CUSTOM_VIDEO);
    const customVideo = rawCustomVid !== null ? rawCustomVid : (init.customVideo || '');
    const savedImages = getMediaLibrary('image', init, customWp);
    const savedVideos = getMediaLibrary('video', init, customVideo);
    const taskVoices = getMediaLibrary('audio', init, '');
    const taskVoiceEnabled = localStorage.getItem(STORAGE_TASK_VOICE_ENABLED) !== null
      ? localStorage.getItem(STORAGE_TASK_VOICE_ENABLED) !== 'false'
      : (init.taskVoiceEnabled !== undefined ? init.taskVoiceEnabled : true);
    const rawTaskVol = localStorage.getItem(STORAGE_TASK_VOICE_VOL) ?? init.taskVoiceVol;
    const taskVoiceVol = rawTaskVol !== undefined && rawTaskVol !== null && rawTaskVol !== ''
      ? Math.max(0, Math.min(100, parseInt(rawTaskVol, 10)))
      : 85;
    const customGreetings = readCustomGreetings(init);
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
    const soundMuted = localStorage.getItem(STORAGE_SOUND_MUTED) === 'true';
    const rawVol = localStorage.getItem(STORAGE_SOUND_VOLUME);
    const soundVolume = rawVol !== null ? Math.min(1, Math.max(0, parseFloat(rawVol))) : 0.38;
    const rawVoice = localStorage.getItem(STORAGE_VOICE_ENABLED);
    const voiceEnabled = rawVoice !== null
      ? rawVoice !== 'false'
      : (init.voiceEnabled !== undefined ? init.voiceEnabled : true);
    const rawIntro = localStorage.getItem(STORAGE_INTRO_ENABLED);
    const introEnabled = rawIntro !== null
      ? rawIntro !== 'false'
      : (init.introEnabled !== undefined ? init.introEnabled : true);
    const bootIntro = localStorage.getItem(STORAGE_BOOT_INTRO) !== null
      ? localStorage.getItem(STORAGE_BOOT_INTRO) !== 'false'
      : (init.bootIntro !== undefined ? init.bootIntro : true);
    const sketchReveal = localStorage.getItem(STORAGE_SKETCH_REVEAL) !== null
      ? localStorage.getItem(STORAGE_SKETCH_REVEAL) !== 'false'
      : (init.sketchReveal !== undefined ? init.sketchReveal : true);
    const tawaGreeting = localStorage.getItem(STORAGE_TAWA_GREETING) !== null
      ? localStorage.getItem(STORAGE_TAWA_GREETING) !== 'false'
      : (init.tawaGreeting !== undefined ? init.tawaGreeting : true);
    return {
      themeName, bubbleName, inputStyle, dimming, wpEnabled, wpMode,
      customWp, customVideo, savedImages, savedVideos,
      taskVoices, taskVoiceEnabled, taskVoiceVol, customGreetings,
      userAvatar, agentAvatar, glassBlur, avatarSize, avatarRadius,
      themeMode, soundMuted, soundVolume, voiceEnabled, introEnabled,
      bootIntro, sketchReveal, tawaGreeting
    };
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

  function buildHudRingSvg(packOrStyle, primary, secondary, size = 340) {
    const c1 = primary || '#38bdf8';
    const c2 = secondary || c1;
    const isPack = packOrStyle && typeof packOrStyle === 'object';
    const hudSvgInner = isPack ? (packOrStyle.hudSvgInner || '') : '';
    const hudRingStyle = isPack ? (packOrStyle.hudRingStyle || 'magic-circle') : packOrStyle;

    if (hudSvgInner) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="color:${c1};--agy-c1:${c1};--agy-c2:${c2};">${hudSvgInner}</svg>`;
    }
    if (hudRingStyle === 'none') return '';
    if (hudRingStyle === 'cyber-radar') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" stroke="${c1}" stroke-width="1" stroke-dasharray="10 6" opacity="0.8"/>
        <circle cx="100" cy="100" r="70" stroke="${c2}" stroke-width="1.2" stroke-dasharray="28 12 4 12" opacity="0.85"/>
        <circle cx="100" cy="100" r="46" stroke="${c1}" stroke-width="0.9" opacity="0.6"/>
        <path d="M100 6 V24 M100 176 V194 M6 100 H24 M176 100 H194" stroke="${c1}" stroke-width="1.4"/>
        <path d="M100 100 L166 56" stroke="${c2}" stroke-width="1" opacity="0.75"/>
      </svg>`;
    }
    if (hudRingStyle === 'pixel-frame') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect x="18" y="18" width="164" height="164" stroke="${c1}" stroke-width="2" stroke-dasharray="12 8"/>
        <rect x="38" y="38" width="124" height="124" stroke="${c2}" stroke-width="1.5" stroke-dasharray="6 6"/>
        <rect x="76" y="76" width="48" height="48" stroke="${c1}" stroke-width="1.5"/>
        <rect x="96" y="10" width="8" height="8" fill="${c2}"/>
        <rect x="96" y="182" width="8" height="8" fill="${c2}"/>
      </svg>`;
    }
    if (hudRingStyle === 'minimal-arc') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="88" stroke="${c1}" stroke-width="0.9" stroke-dasharray="90 190" stroke-linecap="round" opacity="0.85"/>
        <circle cx="100" cy="100" r="68" stroke="${c2}" stroke-width="0.8" stroke-dasharray="55 160" stroke-linecap="round" opacity="0.65"/>
      </svg>`;
    }
    if (hudRingStyle === 'orbital-halo') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="88" stroke="${c1}" stroke-width="1" opacity="0.75"/>
        <ellipse cx="100" cy="100" rx="92" ry="38" transform="rotate(-24 100 100)" stroke="${c2}" stroke-width="1.1" stroke-dasharray="14 6" opacity="0.85"/>
        <ellipse cx="100" cy="100" rx="92" ry="38" transform="rotate(24 100 100)" stroke="${c1}" stroke-width="0.9" opacity="0.55"/>
        <circle cx="164" cy="38" r="3.5" fill="${c2}"/>
        <circle cx="36" cy="162" r="2.5" fill="${c1}"/>
      </svg>`;
    }
    // magic-circle (default)
    return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="90" stroke="${c1}" stroke-width="1.2" opacity="0.85"/>
      <circle cx="100" cy="100" r="78" stroke="${c2}" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.75"/>
      <polygon points="100,16 172,142 28,142" stroke="${c1}" stroke-width="1" opacity="0.7"/>
      <polygon points="100,184 172,58 28,58" stroke="${c2}" stroke-width="1" opacity="0.7"/>
      <circle cx="100" cy="100" r="36" stroke="${c1}" stroke-width="1" opacity="0.65"/>
    </svg>`;
  }

  function resolveParticleMotionAnim(motion, fallbackStyle) {
    if (motion === 'fall') return 'agyParticleFall';
    if (motion === 'rise') return 'agyParticleRise';
    if (motion === 'float') return 'agyParticleFloat';
    if (motion === 'orbit') return 'agyParticleOrbit';
    if (motion === 'pulse') return 'agyParticlePulse';
    if (motion === 'drift') return 'agyParticleDrift';
    if (fallbackStyle === 'embers' || fallbackStyle === 'sparks') return 'agyParticleRise';
    if (fallbackStyle === 'petals' || fallbackStyle === 'leaves') return 'agyParticleDrift';
    if (fallbackStyle === 'stars' || fallbackStyle === 'grid-dots') return 'agyParticleTwinkle';
    return 'agyParticleFloat';
  }

  function getBuiltinParticleSvgInner(shapeKey) {
    const s = String(shapeKey || '').toLowerCase();
    if (s === 'diamond' || s === 'crystal' || s === 'crystals') {
      return '<polygon points="12,2 21,12 12,22 3,12"/>';
    }
    if (s === 'petal' || s === 'petals') {
      return '<path d="M12 2 C17 6 19 13 12 22 C5 13 7 6 12 2 Z"/>';
    }
    if (s === 'leaf' || s === 'leaves') {
      return '<path d="M4 20 C4 10 10 4 20 4 C20 14 14 20 4 20 Z"/>';
    }
    if (s === 'spark' || s === 'sparks') {
      return '<polygon points="12,1 14.2,9.8 23,12 14.2,14.2 12,23 9.8,14.2 1,12 9.8,9.8"/>';
    }
    if (s === 'hex' || s === 'hexagon') {
      return '<polygon points="12,2 20.6,7 20.6,17 12,22 3.4,17 3.4,7"/>';
    }
    if (s === 'ring' || s === 'rings') {
      return '<circle cx="12" cy="12" r="7" fill="none" stroke-width="2.2"/>';
    }
    if (s === 'grid-dots' || s === 'square' || s === 'pixel') {
      return '<rect x="6" y="6" width="12" height="12" rx="1"/>';
    }
    if (s === 'feather') {
      return '<path d="M19 3 C12 4 7 9 5 19 C9 17 14 14 19 3 Z"/>';
    }
    if (s === 'snowflake') {
      return '<path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19" fill="none" stroke-width="1.8" stroke-linecap="round"/>';
    }
    if (s === 'ember' || s === 'embers' || s === 'orb' || s === 'orbs') {
      return '<circle cx="12" cy="12" r="5"/>';
    }
    // stars / default
    return '<polygon points="12,2 14.6,8.8 22,9.3 16.3,14 18,21 12,17.3 6,21 7.7,14 2,9.3 9.4,8.8"/>';
  }

  function buildParticlesHtml(pack, primary, secondary) {
    const pStyle = pack.particleStyle || 'stars';
    const pShape = pack.particleShape || pStyle;
    const count = pack.particleCount !== undefined ? pack.particleCount : 11;
    if (pStyle === 'none' || pShape === 'none' || count <= 0) return '';
    const c1 = primary || '#38bdf8';
    const c2 = secondary || c1;
    const animName = resolveParticleMotionAnim(pack.particleMotion, pStyle);
    const svgInner = pack.particleSvgInner || getBuiltinParticleSvgInner(pShape);
    let out = '';
    for (let i = 0; i < count; i++) {
      const left = ((i * 17 + 7) % 92) + 4;
      const top = ((i * 23 + 11) % 86) + 6;
      const dur = 8.5 + (i % 5) * 2.2;
      const delay = -((i * 1.3) % 8).toFixed(1);
      const color = i % 2 === 0 ? c1 : c2;
      const sz = 8 + (i % 4) * 3;
      out += `<span class="agy-fx-particle" style="position:absolute;left:${left}%;top:${top}%;width:${sz}px;height:${sz}px;color:${color};will-change:transform,opacity;animation:${animName} ${dur}s ease-in-out ${delay}s infinite;"><svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="currentColor" stroke="currentColor" stroke-width="1.2" style="display:block;overflow:visible;">${svgInner}</svg></span>`;
    }
    return out;
  }

  function syncDynamicFxLayer(isDynamic, theme) {
    const existing = document.getElementById('agy-dynamic-fx-layer');
    if (!isDynamic) {
      if (existing) existing.remove();
      return;
    }
    const pack = resolveDynamicPack(theme);
    const primary = (theme && theme.primary) || '#38bdf8';
    const secondary = (theme && theme.secondary) || primary;
    const packKey = `${pack.archetype}|${pack.particleStyle}|${pack.particleShape}|${pack.particleMotion}|${pack.particleCount}|${pack.hudRingStyle}|${pack.particleSvgInner.length}|${pack.hudSvgInner.length}|${primary}|${secondary}`;
    let layer = existing;
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'agy-dynamic-fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
      document.body.appendChild(layer);
    }
    if (layer.dataset.packKey !== packKey) {
      layer.dataset.packKey = packKey;
      const ringSvg = buildHudRingSvg(pack, primary, secondary, 380);
      const ringHtml = ringSvg
        ? `<div class="agy-fx-hud-ring" style="position:absolute;right:-70px;bottom:-70px;width:380px;height:380px;opacity:0.18;pointer-events:none;will-change:transform,opacity;animation:agyHudSpin 38s linear infinite;">${ringSvg}</div>`
        : '';
      layer.innerHTML = buildParticlesHtml(pack, primary, secondary) + ringHtml;
    }
  }

  function removeDynamicHudWidgets() {
    ['agy-hud-top-pill', 'agy-hud-status-widget', 'agy-hud-quick-dock'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function syncDynamicHudWidgets(isDynamic, theme) {
    if (!isDynamic) {
      removeDynamicHudWidgets();
      return;
    }
    const th = theme || {};
    const pack = resolveDynamicPack(th);
    const ui = pack.uiDesign || {};
    const primary = th.primary || '#38bdf8';
    const secondary = th.secondary || primary;
    const isLight = Boolean(th.isLight);
    const bgSurface = isLight ? 'rgba(255, 255, 255, 0.90)' : (th.modalBg || 'rgba(8, 12, 22, 0.88)');
    const textInk = isLight ? '#0f172a' : '#f8fafc';
    const mutedInk = isLight ? '#475569' : '#94a3b8';
    const borderCol = th.borderColor || (isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(56, 189, 248, 0.32)');
    const glowCol = th.glow || 'rgba(56, 189, 248, 0.28)';
    const fontStack = getFontVibeStack(ui.fontVibe);

    // 1. #agy-hud-top-pill
    let topPill = document.getElementById('agy-hud-top-pill');
    if (!topPill) {
      topPill = document.createElement('button');
      topPill.id = 'agy-hud-top-pill';
      topPill.type = 'button';
      topPill.title = 'Open Custom Theme Studio';
      topPill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCustomThemeModal();
      });
      document.body.appendChild(topPill);
    }
    topPill.style.cssText = [
      'position:fixed',
      'top:42px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9000',
      'opacity:0.88',
      'pointer-events:auto',
      'cursor:pointer',
      'display:inline-flex',
      'align-items:center',
      'gap:7px',
      'padding:3px 12px',
      'border-radius:9999px',
      `background:${bgSurface}`,
      `border:1px solid ${borderCol}`,
      `color:${textInk}`,
      `font-family:${fontStack}`,
      'font-size:10.5px',
      'font-weight:700',
      'letter-spacing:0.8px',
      'text-transform:uppercase',
      `box-shadow:0 4px 14px rgba(0,0,0,0.32), 0 0 10px ${glowCol}`,
      'backdrop-filter:none',
      'white-space:nowrap',
      'max-width:340px',
      'overflow:hidden',
      'text-overflow:ellipsis'
    ].join(';');
    topPill.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;flex:none;background:${primary};box-shadow:0 0 8px ${primary};animation:agyStudioBreath 2.2s ease-in-out infinite;"></span><span>${escHtml(ui.topBarPillText || pack.archetypeLabel)}</span>`;

    // 2. #agy-hud-status-widget
    const hw = ui.hudWidget || {};
    let statusWidget = document.getElementById('agy-hud-status-widget');
    if (!statusWidget) {
      statusWidget = document.createElement('div');
      statusWidget.id = 'agy-hud-status-widget';
      document.body.appendChild(statusWidget);
    }
    const isCollapsed = Boolean(window.__AGY_HUD_WIDGET_COLLAPSED__);
    statusWidget.style.cssText = [
      'position:fixed',
      'top:52px',
      'right:18px',
      'z-index:9000',
      isCollapsed ? 'width:auto' : 'width:190px',
      'pointer-events:none',
      `font-family:${fontStack}`,
      `color:${textInk}`
    ].join(';');

    if (isCollapsed) {
      statusWidget.innerHTML = `<button type="button" data-hud-widget-toggle="1" title="Expand HUD Status" style="pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;background:${bgSurface};border:1px solid ${borderCol};color:${primary};font-size:10px;font-weight:700;letter-spacing:0.6px;box-shadow:0 4px 14px rgba(0,0,0,0.3);backdrop-filter:none;"><span style="width:5px;height:5px;border-radius:50%;background:${primary};"></span>${escHtml(hw.badge || 'HUD')}</button>`;
    } else {
      const cardRadius = Math.min(14, Number.isFinite(ui.cardRadiusPx) ? ui.cardRadiusPx : 10);
      statusWidget.innerHTML = `
        <div style="pointer-events:auto;position:relative;padding:9px 11px;border-radius:${cardRadius}px;background:${bgSurface};border:1px solid ${borderCol};border-left:3px solid ${primary};box-shadow:0 8px 24px rgba(0,0,0,0.38), 0 0 12px ${glowCol};backdrop-filter:none;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
            <span style="font-size:9.5px;font-weight:800;letter-spacing:0.8px;padding:1px 6px;border-radius:9999px;background:${glowCol};color:${primary};border:1px solid ${borderCol};">${escHtml(hw.badge || 'SYNC')}</span>
            <button type="button" data-hud-widget-toggle="1" title="Collapse HUD Widget" style="pointer-events:auto;cursor:pointer;background:transparent;border:none;color:${mutedInk};font-size:13px;line-height:1;padding:0 2px;">×</button>
          </div>
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.4px;color:${textInk};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(hw.title || pack.introTitle)}</div>
          <div style="font-size:9.5px;color:${mutedInk};letter-spacing:0.5px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(hw.subtitle || pack.archetypeLabel)}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:6px;padding-top:5px;border-top:1px solid ${isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.08)'};font-size:9.5px;font-weight:600;color:${secondary};">
            <span style="width:5px;height:5px;border-radius:50%;background:${primary};box-shadow:0 0 6px ${primary};"></span>
            <span>${escHtml(hw.statusText || 'SYNC 100%')}</span>
          </div>
        </div>
      `;
    }
    const toggleBtn = statusWidget.querySelector('[data-hud-widget-toggle="1"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.__AGY_HUD_WIDGET_COLLAPSED__ = !window.__AGY_HUD_WIDGET_COLLAPSED__;
        syncDynamicHudWidgets(true, th);
      });
    }

    // 3. #agy-hud-quick-dock
    let quickDock = document.getElementById('agy-hud-quick-dock');
    if (!quickDock) {
      quickDock = document.createElement('div');
      quickDock.id = 'agy-hud-quick-dock';
      document.body.appendChild(quickDock);
    }
    const dockPos = ui.dockPosition || 'right-vertical';
    const dockPosCss = dockPos === 'bottom-right'
      ? 'right:18px;bottom:88px;flex-direction:row;'
      : (dockPos === 'top-right'
        ? 'right:18px;top:160px;flex-direction:row;'
        : 'right:16px;top:50%;transform:translateY(-50%);flex-direction:column;');
    quickDock.style.cssText = `position:fixed;${dockPosCss}z-index:9000;display:flex;gap:7px;pointer-events:none;`;

    const dockShape = ui.dockShape || 'circle';
    const btnShapeCss = dockShape === 'hex'
      ? 'width:34px;height:32px;clip-path:polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);border-radius:0;'
      : (dockShape === 'pill'
        ? 'width:38px;height:28px;border-radius:9999px;'
        : (dockShape === 'square'
          ? 'width:32px;height:32px;border-radius:6px;'
          : 'width:32px;height:32px;border-radius:9999px;'));

    const isMuted = localStorage.getItem(STORAGE_SOUND_MUTED) === 'true';
    const dockBtnBase = `pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;${btnShapeCss}background:${bgSurface};border:1px solid ${borderCol};color:${textInk};font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.35), 0 0 8px ${glowCol};backdrop-filter:none;transition:transform 0.14s ease, border-color 0.14s ease;`;
    quickDock.innerHTML = `
      <button type="button" data-hud-action="studio" title="Open Custom Theme Studio" style="${dockBtnBase}">🎨</button>
      <button type="button" data-hud-action="intro" title="Preview Intro" style="${dockBtnBase}">▶</button>
      <button type="button" data-hud-action="mode" title="Toggle Dynamic / Static" style="${dockBtnBase}">⚡</button>
      <button type="button" data-hud-action="sound" title="${isMuted ? 'Unmute Sound' : 'Mute Sound'}" style="${dockBtnBase}">${isMuted ? '🔇' : '🔊'}</button>
    `;
    quickDock.querySelectorAll('button[data-hud-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const act = btn.getAttribute('data-hud-action');
        if (act === 'studio') {
          openCustomThemeModal();
        } else if (act === 'intro') {
          showThemeIntro(th, true);
        } else if (act === 'mode') {
          const cur = getStateSafe();
          const nextMode = cur.themeMode === 'static' ? 'dynamic' : 'static';
          applyTheme({ themeMode: nextMode });
        } else if (act === 'sound') {
          const curMuted = localStorage.getItem(STORAGE_SOUND_MUTED) === 'true';
          const nextMuted = !curMuted;
          localStorage.setItem(STORAGE_SOUND_MUTED, String(nextMuted));
          btn.textContent = nextMuted ? '🔇' : '🔊';
          btn.title = nextMuted ? 'Unmute Sound' : 'Mute Sound';
          if (!nextMuted) playClickSound(th);
        }
      });
    });
  }

  function dismissThemeIntro() {
    if (window.__AGY_INTRO_TIMERS__) {
      window.__AGY_INTRO_TIMERS__.forEach(id => clearTimeout(id));
    }
    window.__AGY_INTRO_TIMERS__ = [];
    if (window.__AGY_INTRO_ESC__) {
      window.removeEventListener('keydown', window.__AGY_INTRO_ESC__, true);
      window.__AGY_INTRO_ESC__ = null;
    }
    const old = document.getElementById('agy-intro-overlay');
    if (old) old.remove();
  }

  function showThemeIntro(theme, force = false) {
    const st = getStateSafe();
    if (st.themeMode === 'static') return;
    if (!force && !st.introEnabled) return;
    dismissThemeIntro();

    const th = theme || THEMES[st.themeName] || THEMES[getDefaultThemeKey()] || {};
    const pack = resolveDynamicPack(th);
    const primary = th.primary || '#38bdf8';
    const secondary = th.secondary || primary;
    const ringArg = pack.hudSvgInner ? pack : (pack.hudRingStyle === 'none' ? 'orbital-halo' : pack.hudRingStyle);
    const ringSvg = buildHudRingSvg(ringArg, primary, secondary, 210);
    const introFont = getFontVibeStack(pack.uiDesign && pack.uiDesign.fontVibe);

    const overlay = document.createElement('div');
    overlay.id = 'agy-intro-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:100001;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(7,9,15,0.82);cursor:pointer;opacity:1;transition:opacity 0.35s ease;font-family:${introFont};`;
    overlay.innerHTML = `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:220px;height:220px;margin-bottom:18px;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;will-change:transform;animation:agyHudSpin 14s linear infinite;">${ringSvg}</div>
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${primary};text-transform:uppercase;text-align:center;">${escHtml(pack.archetypeLabel)}</div>
      </div>
      <div style="font-size:20px;font-weight:800;letter-spacing:2.4px;color:#f8fafc;text-align:center;text-shadow:0 0 18px ${primary}66;">${escHtml(pack.introTitle)}</div>
      <div style="font-size:12px;font-weight:600;letter-spacing:1.6px;color:${secondary};margin-top:6px;margin-bottom:18px;text-align:center;">${escHtml(pack.introSubtitle)}</div>
      <div style="display:flex;flex-direction:column;gap:6px;min-width:220px;">
        ${pack.introChecks.map((lbl, idx) => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-family:monospace;font-size:12px;color:#e2e8f0;opacity:0;animation:agyIntroCheckIn 0.28s ease forwards;animation-delay:${160 + idx * 170}ms;">
            <span style="color:#94a3b8;">${escHtml(lbl)}</span>
            <span style="color:${primary};font-weight:700;">[ OK ]</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:20px;font-size:11px;color:#64748b;letter-spacing:0.6px;">Click or press Esc to skip</div>
    `;

    document.body.appendChild(overlay);
    speakSystemSequence([pack.introSubtitle, pack.voiceWelcome].filter(Boolean), pack);

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dismissThemeIntro();
      }
    };
    window.__AGY_INTRO_ESC__ = onEsc;
    window.addEventListener('keydown', onEsc, true);
    overlay.addEventListener('click', () => dismissThemeIntro());

    const t1 = setTimeout(() => {
      if (overlay.parentNode) overlay.style.opacity = '0';
    }, 1850);
    const t2 = setTimeout(() => dismissThemeIntro(), 2220);
    window.__AGY_INTRO_TIMERS__ = [t1, t2];
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

  function clearRevealRaf() {
    if (window.__AGY_REVEAL_RAF__) {
      cancelAnimationFrame(window.__AGY_REVEAL_RAF__);
      window.__AGY_REVEAL_RAF__ = 0;
    }
  }

  function triggerSketchBloomReveal(instant = false) {
    const st = getState();
    if (st.themeMode === 'static') {
      clearRevealRaf();
      return;
    }
    const shouldInstant = instant || !st.sketchReveal;
    loadLazyModule('reveal')
      .then((fn) => { if (typeof fn === 'function') fn(window.__AGY_INTERNAL__, shouldInstant); })
      .catch(() => {
        clearRevealRaf();
        const layer = document.getElementById('agy-live-bg-layer');
        const mediaWrap = document.getElementById('agy-live-media-wrap');
        if (mediaWrap) {
          mediaWrap.style.webkitMaskImage = 'none';
          mediaWrap.style.maskImage = 'none';
        }
        if (layer && st.wpMode !== 'video') {
          layer.classList.add('agy-bg-hidden');
        }
      });
  }
  window.__ANTIGRAVITY_REPLAY_REVEAL__ = () => triggerSketchBloomReveal(false);

  function scheduleRevealWhenReady(allowInstant = false) {
    window.__AGY_BOOT_FINISHED__ = true;
    const st = getState();
    if (st.themeMode === 'static') {
      clearRevealRaf();
      return;
    }
    const shouldInstant = allowInstant || !st.sketchReveal;
    if (shouldInstant) {
      window.__AGY_REVEAL_DONE_ONCE__ = true;
      triggerSketchBloomReveal(true);
      return;
    }
    const vidEl = document.getElementById('agy-live-bg-video');
    const imgEl = document.getElementById('agy-live-bg-img');
    const isVideoMode = st.wpMode === 'video' && Boolean(vidEl && vidEl.getAttribute('data-src'));
    if (isVideoMode && vidEl && vidEl.readyState < 2) {
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        window.__AGY_REVEAL_DONE_ONCE__ = true;
        triggerSketchBloomReveal(false);
      };
      vidEl.addEventListener('loadeddata', fire, { once: true });
      setTimeout(fire, 650);
    } else if (!isVideoMode && imgEl && imgEl.getAttribute('data-src') && !imgEl.complete) {
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        window.__AGY_REVEAL_DONE_ONCE__ = true;
        triggerSketchBloomReveal(false);
      };
      imgEl.addEventListener('load', fire, { once: true });
      setTimeout(fire, 500);
    } else {
      window.__AGY_REVEAL_DONE_ONCE__ = true;
      triggerSketchBloomReveal(false);
    }
  }

  function releaseVideoDecoder(videoEl) {
    if (!videoEl) return;
    try { videoEl.pause(); } catch (e) {}
    videoEl.style.opacity = '0';
    videoEl.style.display = 'none';
    if (videoEl.getAttribute('src') || videoEl.getAttribute('data-src')) {
      videoEl.removeAttribute('src');
      videoEl.removeAttribute('data-src');
      videoEl.removeAttribute('poster');
      try { videoEl.load(); } catch (e) {}
    }
  }

  function syncVideoAndRevealLayer(st, mainTheme, wpImageUrl, wpVideoUrl, isVideoMode, overlayRgb, overlayAlpha, bgPosition, blurStr) {
    const shell = findActiveShell();
    if (!shell) return;

    let layer = document.getElementById('agy-live-bg-layer');
    if (layer && (layer.tagName !== 'AGY-LIVE-BG' || layer.parentElement !== shell)) {
      layer.remove();
      layer = null;
    }
    if (!st.wpEnabled || st.themeMode === 'static') {
      clearRevealRaf();
      releaseVideoDecoder(document.getElementById('agy-live-bg-video'));
      if (layer) layer.remove();
      return;
    }

    if (!layer) {
      layer = document.createElement('agy-live-bg');
      layer.id = 'agy-live-bg-layer';
      layer.style.cssText = 'display:block;position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;overflow:hidden;background:transparent;';
      layer.innerHTML = `
        <div id="agy-live-media-wrap" style="position:absolute;inset:0;overflow:hidden;">
          <video id="agy-live-bg-video" autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;opacity:0;transition:opacity 0.3s ease;"></video>
          <img id="agy-live-bg-img" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;" />
          <div id="agy-live-scrim" style="position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity 0.25s ease;"></div>
        </div>
        <canvas id="agy-sketch-reveal-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;display:none;"></canvas>
      `;
      shell.insertBefore(layer, shell.firstChild);
    }

    const mediaWrap = document.getElementById('agy-live-media-wrap');
    const videoEl = document.getElementById('agy-live-bg-video');
    const imgEl = document.getElementById('agy-live-bg-img');
    const scrimEl = document.getElementById('agy-live-scrim');

    const secondaryGlowStop = mainTheme.secondaryGlow
      ? `, radial-gradient(circle at 22% 72%, ${mainTheme.secondaryGlow} 0%, transparent 55%)`
      : '';
    if (scrimEl) {
      scrimEl.style.background = mainTheme.clearBackdrop
        ? `linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%)`
        : `radial-gradient(circle at 75% 40%, ${mainTheme.glow} 0%, transparent 65%)${secondaryGlowStop}, linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha * 0.85}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%)`;
    }

    if (videoEl) videoEl.style.objectPosition = bgPosition || 'center center';
    if (imgEl) imgEl.style.objectPosition = bgPosition || 'center center';

    if (isVideoMode && wpVideoUrl) {
      layer.classList.remove('agy-bg-hidden');
      if (imgEl) imgEl.style.display = 'none';
      if (videoEl) {
        videoEl.style.display = 'block';
        if (!/^(?:data|blob|file):/i.test(wpVideoUrl)) {
          videoEl.crossOrigin = 'anonymous';
        } else {
          videoEl.removeAttribute('crossorigin');
        }
        if (!st.customVideo && wpImageUrl) {
          videoEl.poster = wpImageUrl;
        } else {
          videoEl.removeAttribute('poster');
        }
        const markVideoReady = () => {
          videoEl.style.opacity = '1';
          if (scrimEl) scrimEl.style.opacity = '1';
        };
        if (videoEl.readyState >= 2) markVideoReady();
        if (videoEl.getAttribute('data-src') !== wpVideoUrl) {
          videoEl.removeAttribute('data-fallback-tried');
          videoEl.style.opacity = '0';
          if (scrimEl) scrimEl.style.opacity = '0';
          videoEl.setAttribute('data-src', wpVideoUrl);
          videoEl.onloadeddata = () => {
            markVideoReady();
            if ((!wpImageUrl || Boolean(st.customVideo)) && mainTheme.unifiedGlass) {
              try {
                const c = document.createElement('canvas');
                c.width = 480;
                c.height = Math.max(240, Math.round(480 * ((videoEl.videoHeight || 1080) / Math.max(1, videoEl.videoWidth || 1920))));
                const gctx = c.getContext('2d');
                if (gctx) {
                  gctx.drawImage(videoEl, 0, 0, c.width, c.height);
                  const frameUrl = c.toDataURL('image/webp', 0.82);
                  c.width = 0; c.height = 0;
                  syncPrebakedGlass(frameUrl, overlayRgb, overlayAlpha, mainTheme.headerBg || '', blurStr);
                } else {
                  c.width = 0; c.height = 0;
                }
              } catch (e) {}
            }
          };
          videoEl.onplaying = markVideoReady;
          videoEl.onerror = () => {
            const fallbackVid = resolveMediaUrl(mainTheme.wallpaperVideo || mainTheme.videoUrl || '');
            if (fallbackVid && wpVideoUrl !== fallbackVid && !videoEl.getAttribute('data-fallback-tried')) {
              videoEl.setAttribute('data-fallback-tried', '1');
              videoEl.removeAttribute('crossorigin');
              videoEl.setAttribute('data-src', fallbackVid);
              videoEl.src = fallbackVid;
              videoEl.load();
              if (!document.hidden) {
                delete videoEl.dataset.agyPausedByHidden;
                videoEl.play().catch(() => {});
              } else {
                videoEl.dataset.agyPausedByHidden = '1';
              }
              return;
            }
            videoEl.style.opacity = '0';
            if (scrimEl) scrimEl.style.opacity = '0';
          };
          videoEl.src = wpVideoUrl;
          videoEl.load();
          if (!document.hidden) {
            delete videoEl.dataset.agyPausedByHidden;
            videoEl.play().catch(() => {});
          } else {
            videoEl.dataset.agyPausedByHidden = '1';
          }
        } else if (videoEl.paused) {
          if (!document.hidden) {
            delete videoEl.dataset.agyPausedByHidden;
            videoEl.play().catch(() => {});
          } else {
            videoEl.dataset.agyPausedByHidden = '1';
          }
        }
      }
      if (!window.__AGY_REVEAL_DONE_ONCE__ && (!st.bootIntro || window.__AGY_BOOT_FINISHED__)) {
        scheduleRevealWhenReady(false);
      } else if (!window.__AGY_REVEAL_RAF__ && mediaWrap) {
        mediaWrap.style.webkitMaskImage = 'none';
        mediaWrap.style.maskImage = 'none';
      }
    } else {
      if (scrimEl) scrimEl.style.opacity = '0';
      releaseVideoDecoder(videoEl);
      if (imgEl && wpImageUrl) {
        if (!/^(?:data|blob|file):/i.test(wpImageUrl)) {
          imgEl.crossOrigin = 'anonymous';
        } else {
          imgEl.removeAttribute('crossorigin');
        }
        imgEl.style.display = 'block';
        if (imgEl.getAttribute('data-src') !== wpImageUrl) {
          imgEl.setAttribute('data-src', wpImageUrl);
          imgEl.src = wpImageUrl;
        }
      }
      if (!window.__AGY_REVEAL_DONE_ONCE__ && (!st.bootIntro || window.__AGY_BOOT_FINISHED__)) {
        scheduleRevealWhenReady(false);
      } else if (!window.__AGY_REVEAL_RAF__) {
        layer.classList.add('agy-bg-hidden');
      }
    }
  }

  function clearBootTimers() {
    if (Array.isArray(window.__AGY_BOOT_TIMERS__)) {
      window.__AGY_BOOT_TIMERS__.forEach((id) => clearTimeout(id));
    }
    window.__AGY_BOOT_TIMERS__ = [];
    if (window.__AGY_BOOT_CLOCK__) {
      clearInterval(window.__AGY_BOOT_CLOCK__);
      window.__AGY_BOOT_CLOCK__ = null;
    }
    if (window.__AGY_BOOT_HEX__) {
      clearInterval(window.__AGY_BOOT_HEX__);
      window.__AGY_BOOT_HEX__ = null;
    }
    if (window.__AGY_BOOT_KEYDOWN__) {
      window.removeEventListener('keydown', window.__AGY_BOOT_KEYDOWN__, true);
      window.__AGY_BOOT_KEYDOWN__ = null;
    }
  }

  function stopBootAudio() {
    if (window.__AGY_BOOT_AUDIO__) {
      try {
        window.__AGY_BOOT_AUDIO__.pause();
        window.__AGY_BOOT_AUDIO__.currentTime = 0;
      } catch (e) {}
      window.__AGY_BOOT_AUDIO__ = null;
    }
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {}
  }

  function teardownBootOverlay() {
    clearBootTimers();
    stopBootAudio();
    const ov = document.getElementById('agy-boot-overlay');
    if (ov) ov.remove();
    const fl = document.getElementById('agy-flash-curtain');
    if (fl) fl.remove();
    const st = document.getElementById('agy-boot-styles');
    if (st) st.remove();
  }

  function mountBootSequence(forceReplay = false) {
    const st = getState();
    if (!forceReplay && (st.themeMode === 'static' || !st.bootIntro || window.__AGY_BOOT_PLAYED__)) {
      return;
    }
    if (st.themeMode === 'static' && forceReplay) {
      applyTheme({ themeMode: 'dynamic' });
    }
    window.__AGY_BOOT_PLAYED__ = true;
    loadLazyModule('boot')
      .then((fn) => { if (typeof fn === 'function') fn(window.__AGY_INTERNAL__, forceReplay); })
      .catch(() => {
        window.__AGY_BOOT_FINISHED__ = true;
        const cur = getState();
        const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
        showThemeIntro(th, forceReplay);
        scheduleRevealWhenReady(true);
      });
  }
  window.__ANTIGRAVITY_REPLAY_BOOT__ = () => mountBootSequence(true);

  function ensureGreetingFonts() {
    if (document.getElementById('agy-greeting-font-style')) return;
    const host = document.head || document.documentElement;
    if (!host) return;
    const subsets = [
      {
        src: resolveMediaUrl(BOOT_ASSETS.greetingFontVi || 'assets/fonts/mali-500-vi.woff2'),
        range: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'
      },
      {
        src: resolveMediaUrl(BOOT_ASSETS.greetingFontLatinExt || 'assets/fonts/mali-500-latin-ext.woff2'),
        range: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'
      },
      {
        src: resolveMediaUrl(BOOT_ASSETS.greetingFontLatin || 'assets/fonts/mali-500-latin.woff2'),
        range: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
      }
    ];
    const fontEl = document.createElement('style');
    fontEl.id = 'agy-greeting-font-style';
    fontEl.textContent = subsets.map((s) => `
      @font-face {
        font-family: 'AgyTawaMali';
        font-style: normal;
        font-weight: 500;
        font-display: swap;
        src: url("${sanitizeCssUrl(s.src)}") format('woff2');
        unicode-range: ${s.range};
      }`).join('\n');
    host.appendChild(fontEl);
  }

  function applyTheme(overrides = {}) {
    const st = { ...getState(), ...overrides };
    st.themeMode = st.themeMode === 'static' ? 'static' : 'dynamic';
    if (st.tawaGreeting) ensureGreetingFonts();
    try {
      localStorage.setItem(STORAGE_THEME, st.themeName);
      localStorage.setItem(STORAGE_BUBBLE, st.bubbleName);
      localStorage.setItem(STORAGE_INPUT, st.inputStyle);
      localStorage.setItem(STORAGE_DIMMING, String(st.dimming));
      localStorage.setItem(STORAGE_WP_ENABLED, String(st.wpEnabled));
      localStorage.setItem(STORAGE_WP_MODE, st.wpMode);
      localStorage.setItem(STORAGE_THEME_MODE, st.themeMode);
      if (overrides.customWp !== undefined) {
        localStorage.setItem(STORAGE_CUSTOM_WP, overrides.customWp);
      }
      if (overrides.customVideo !== undefined) {
        localStorage.setItem(STORAGE_CUSTOM_VIDEO, overrides.customVideo);
      }
      if (overrides.savedImages !== undefined) {
        localStorage.setItem(STORAGE_SAVED_IMAGES, JSON.stringify(st.savedImages));
      }
      if (overrides.savedVideos !== undefined) {
        localStorage.setItem(STORAGE_SAVED_VIDEOS, JSON.stringify(st.savedVideos));
      }
      if (overrides.taskVoices !== undefined) {
        localStorage.setItem(STORAGE_TASK_VOICES, JSON.stringify(st.taskVoices));
      }
      if (overrides.taskVoiceEnabled !== undefined) {
        localStorage.setItem(STORAGE_TASK_VOICE_ENABLED, String(st.taskVoiceEnabled));
      }
      if (overrides.taskVoiceVol !== undefined) {
        localStorage.setItem(STORAGE_TASK_VOICE_VOL, String(st.taskVoiceVol));
      }
      if (overrides.customGreetings !== undefined) {
        localStorage.setItem(STORAGE_CUSTOM_GREETINGS, JSON.stringify(st.customGreetings));
      }
      if (overrides.bootIntro !== undefined) {
        localStorage.setItem(STORAGE_BOOT_INTRO, String(st.bootIntro));
      }
      if (overrides.sketchReveal !== undefined) {
        localStorage.setItem(STORAGE_SKETCH_REVEAL, String(st.sketchReveal));
      }
      if (overrides.tawaGreeting !== undefined) {
        localStorage.setItem(STORAGE_TAWA_GREETING, String(st.tawaGreeting));
      }
      if (overrides.userAvatar !== undefined) {
        localStorage.setItem(STORAGE_USER_AVATAR, overrides.userAvatar);
      }
      if (overrides.agentAvatar !== undefined) {
        localStorage.setItem(STORAGE_AGENT_AVATAR, overrides.agentAvatar);
      }
      if (overrides.glassBlur !== undefined) {
        localStorage.setItem(STORAGE_GLASS_BLUR, String(st.glassBlur));
      }
      if (overrides.avatarSize !== undefined) {
        localStorage.setItem(STORAGE_AVATAR_SIZE, String(st.avatarSize));
      }
      if (overrides.avatarRadius !== undefined) {
        localStorage.setItem(STORAGE_AVATAR_RADIUS, String(st.avatarRadius));
      }
      // Persist sound settings; auto-mute when switching to Static mode
      if (overrides.soundMuted !== undefined) {
        localStorage.setItem(STORAGE_SOUND_MUTED, String(overrides.soundMuted));
      } else if (overrides.themeMode === 'static') {
        // Don't auto-mute, but mark mode so isSoundEnabled() returns false
      }
      if (overrides.soundVolume !== undefined) {
        localStorage.setItem(STORAGE_SOUND_VOLUME, String(overrides.soundVolume));
      }
      localStorage.setItem(STORAGE_VOICE_ENABLED, String(st.voiceEnabled));
      localStorage.setItem(STORAGE_INTRO_ENABLED, String(st.introEnabled));
    } catch (e) {}

    if (window.agySaveThemeConfig) {
      try {
        window.agySaveThemeConfig(JSON.stringify(st));
      } catch (e) {}
    }

    if (
      overrides.themeName !== undefined ||
      overrides.customWp !== undefined ||
      overrides.customVideo !== undefined ||
      overrides.wpMode !== undefined
    ) {
      window.__AGY_REVEAL_DONE_ONCE__ = false;
    }

    const mainTheme = THEMES[st.themeName] || THEMES[getDefaultThemeKey()] || {};
    const bubbleTheme = THEMES[st.bubbleName] || mainTheme;
    const wpUrl = resolveMediaUrl(st.customWp || mainTheme.wallpaper || mainTheme.posterUrl || '');
    const wpVideoUrl = resolveMediaUrl(st.customVideo || mainTheme.wallpaperVideo || mainTheme.videoUrl || '');
    const isVideoMode = st.themeMode === 'dynamic' && Boolean(wpVideoUrl) && st.wpMode !== 'image';

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

    const mainPack = resolveDynamicPack(mainTheme);
    const uiDesign = mainPack.uiDesign || { fontVibe: 'sans', cardRadiusPx: 14, borderStyle: 'solid', accentGlowIntensity: 1 };
    const cardRadiusPx = Number.isFinite(uiDesign.cardRadiusPx) ? uiDesign.cardRadiusPx : 14;
    const borderStyle = uiDesign.borderStyle || 'solid';
    const fontVibeStack = getFontVibeStack(uiDesign.fontVibe);
    const glowIntensity = Number.isFinite(uiDesign.accentGlowIntensity) ? uiDesign.accentGlowIntensity : 1;
    const borderAccent = mainTheme.aiCardBorder || mainTheme.borderColor || 'rgba(255, 255, 255, 0.16)';
    const chamferClip = 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)';
    let uiBorderCss = '';
    if (borderStyle === 'double') {
      uiBorderCss = `
      .agy-shell [data-testid="agent-response"],
      .agy-shell .agy-user-bubble,
      .agy-shell .surface-composer-card,
      .agy-card-radius {
        border: 3px double ${borderAccent} !important;
      }`;
    } else if (borderStyle === 'dashed') {
      uiBorderCss = `
      .agy-shell [data-testid="agent-response"],
      .agy-shell .agy-user-bubble,
      .agy-shell .surface-composer-card,
      .agy-card-radius {
        border: 1.5px dashed ${borderAccent} !important;
      }`;
    } else if (borderStyle === 'glow-frame') {
      const gSpread = Math.round(14 * glowIntensity);
      const gInner = Math.round(9 * glowIntensity);
      uiBorderCss = `
      .agy-shell [data-testid="agent-response"],
      .agy-shell .agy-user-bubble,
      .agy-shell .surface-composer-card,
      .agy-card-radius {
        border: 1.5px solid ${mainTheme.primary || borderAccent} !important;
        box-shadow: 0 0 ${gSpread}px ${mainTheme.glow || 'rgba(56,189,248,0.28)'}, inset 0 0 ${gInner}px ${mainTheme.glow || 'rgba(56,189,248,0.16)'} !important;
      }`;
    } else if (borderStyle === 'chamfered') {
      uiBorderCss = `
      .agy-shell [data-testid="agent-response"],
      .agy-shell .agy-user-bubble,
      .agy-shell .surface-composer-card,
      .agy-card-radius {
        clip-path: ${chamferClip} !important;
        border-radius: 0 !important;
      }`;
    }

    const uiDesignVarsCss = `
      .agy-shell,
      #agy-custom-theme-modal-dialog {
        --agy-card-radius: ${cardRadiusPx}px;
        --agy-font-vibe: ${fontVibeStack};
        --agy-glow-intensity: ${glowIntensity};
      }
      .agy-card-radius {
        border-radius: var(--agy-card-radius, ${cardRadiusPx}px) !important;
      }
      #agy-custom-theme-badge,
      #agy-custom-theme-modal-header,
      #agy-live-preview-strip,
      .agy-shell [class*="@container/titlebar"] [data-testid="breadcrumb-segment"],
      .agy-shell [data-testid="agent-response"] :is(h1, h2, h3) {
        font-family: var(--agy-font-vibe, ${fontVibeStack}) !important;
      }
      ${uiBorderCss}
    `;

    let layoutCss = '';
    if (st.themeMode === 'dynamic') {
      const sStyle = uiDesign.sidebarStyle || 'floating-cards';
      const cStyle = uiDesign.composerStyle || 'floating-dock';
      const cardLayout = uiDesign.chatCardLayout || 'hud-panel';
      const pColor = mainTheme.primary || '#38bdf8';
      const sColor = mainTheme.secondary || pColor;
      const gColor = mainTheme.glow || 'rgba(56, 189, 248, 0.24)';

      let sidebarLayoutCss = '';
      if (sStyle === 'floating-cards') {
        sidebarLayoutCss = `
          .agy-shell :is(aside, [data-sidebar="true"], .bg-sidebar:not(.surface-opaque)) {
            margin: 8px 6px 8px 8px !important;
            border-radius: var(--agy-card-radius, ${cardRadiusPx}px) !important;
            border: 1px solid ${borderAccent} !important;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.36), 0 0 14px ${gColor} !important;
            overflow: hidden !important;
            backdrop-filter: none !important;
          }
          .agy-shell :is(aside, [data-sidebar="true"]) :is(a, [class*="group/headerbtn"]) {
            border-radius: ${Math.max(6, cardRadiusPx - 4)}px !important;
            margin: 2px 6px !important;
            padding: 6px 10px !important;
            transition: background-color 0.15s ease, transform 0.15s ease !important;
          }
        `;
      } else if (sStyle === 'framed-panel') {
        sidebarLayoutCss = `
          .agy-shell :is(aside, [data-sidebar="true"], .bg-sidebar:not(.surface-opaque)) {
            margin: 4px 0 4px 4px !important;
            border: 2px solid ${pColor} !important;
            box-shadow: inset 0 0 0 1px ${sColor}, 0 0 16px ${gColor} !important;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px)) !important;
            backdrop-filter: none !important;
          }
          .agy-shell :is(aside, [data-sidebar="true"]) [class*="group/section-header"] {
            border-bottom: 1px solid ${mainTheme.borderColor || borderAccent} !important;
          }
        `;
      } else if (sStyle === 'sleek-rail') {
        sidebarLayoutCss = `
          .agy-shell :is(aside, [data-sidebar="true"], .bg-sidebar:not(.surface-opaque)) {
            border-left: 3px solid ${pColor} !important;
            border-right: 1px solid ${mainTheme.borderColor || 'rgba(255, 255, 255, 0.08)'} !important;
            padding-left: 2px !important;
            backdrop-filter: none !important;
          }
          .agy-shell :is(aside, [data-sidebar="true"]) :is(a, [class*="group/headerbtn"]) {
            border-left: 2px solid transparent !important;
            border-radius: 6px !important;
          }
          .agy-shell :is(aside, [data-sidebar="true"]) :is(a, [class*="group/headerbtn"]):hover {
            border-left-color: ${pColor} !important;
          }
        `;
      }

      let composerLayoutCss = '';
      if (cStyle === 'floating-dock') {
        composerLayoutCss = `
          .agy-shell .surface-composer {
            margin-bottom: 12px !important;
            border-radius: ${Math.max(16, cardRadiusPx + 4)}px !important;
            border-top: 2px solid ${pColor} !important;
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55), 0 0 20px ${gColor} !important;
            backdrop-filter: none !important;
          }
          .agy-shell .surface-composer-card {
            border-radius: ${Math.max(14, cardRadiusPx + 2)}px !important;
            backdrop-filter: none !important;
          }
        `;
      } else if (cStyle === 'hud-console') {
        composerLayoutCss = `
          .agy-shell .surface-composer {
            border: 1.5px solid ${pColor} !important;
            border-radius: 6px !important;
            box-shadow: 0 0 18px ${gColor}, inset 0 0 12px ${gColor} !important;
            background-image: linear-gradient(90deg, ${pColor} 14px, transparent 14px), linear-gradient(90deg, ${pColor} 14px, transparent 14px), linear-gradient(${pColor} 14px, transparent 14px), linear-gradient(${pColor} 14px, transparent 14px) !important;
            background-position: 0 0, 100% 100%, 0 0, 100% 100% !important;
            background-size: 100% 2px, 100% 2px, 2px 100%, 2px 100% !important;
            background-repeat: no-repeat !important;
            backdrop-filter: none !important;
          }
          .agy-shell .surface-composer-card {
            border-radius: 4px !important;
            backdrop-filter: none !important;
          }
        `;
      } else if (cStyle === 'command-bar') {
        composerLayoutCss = `
          .agy-shell .surface-composer {
            border-radius: 8px !important;
            border: 1px solid ${mainTheme.borderColor || 'rgba(255, 255, 255, 0.16)'} !important;
            border-left: 3px solid ${pColor} !important;
            border-right: 3px solid ${sColor} !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.42) !important;
            backdrop-filter: none !important;
          }
          .agy-shell .surface-composer-card {
            border-radius: 6px !important;
            backdrop-filter: none !important;
          }
        `;
      }

      let chatCardLayoutCss = '';
      if (cardLayout === 'hud-panel') {
        chatCardLayoutCss = `
          .agy-shell [data-testid="agent-response"] {
            border-left: 3.5px solid ${pColor} !important;
            border-top: 1px solid ${mainTheme.borderColor || borderAccent} !important;
            border-right: 1px solid ${mainTheme.borderColor || borderAccent} !important;
            border-bottom: 1px solid ${mainTheme.borderColor || borderAccent} !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.34), inset 0 1px 0 ${gColor} !important;
          }
        `;
      } else if (cardLayout === 'terminal-block') {
        chatCardLayoutCss = `
          .agy-shell [data-testid="agent-response"] {
            border: 1px solid ${mainTheme.borderColor || 'rgba(255, 255, 255, 0.14)'} !important;
            border-left: 4px solid ${sColor} !important;
            border-radius: 6px !important;
            font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.38) !important;
          }
        `;
      } else if (cardLayout === 'floating-bubble') {
        chatCardLayoutCss = `
          .agy-shell [data-testid="agent-response"] {
            border-radius: ${Math.max(18, cardRadiusPx + 4)}px !important;
            padding-top: 16px !important;
            padding-bottom: 16px !important;
            padding-right: 20px !important;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32), 0 0 14px ${gColor} !important;
            border: 1px solid ${mainTheme.aiCardBorder || 'rgba(255, 255, 255, 0.14)'} !important;
          }
        `;
      } else if (cardLayout === 'clean-sheet') {
        chatCardLayoutCss = `
          .agy-shell [data-testid="agent-response"] {
            border: 1px solid ${mainTheme.isLight ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255, 255, 255, 0.09)'} !important;
            border-radius: ${Math.min(12, cardRadiusPx)}px !important;
            padding-top: 14px !important;
            padding-bottom: 14px !important;
            padding-right: 18px !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14) !important;
          }
        `;
      }

      layoutCss = `
        /* Dynamic IDE Layout Re-composition: ${uiDesign.layoutPreset} (${sStyle} / ${cStyle} / ${cardLayout}) */
        ${sidebarLayoutCss}
        ${composerLayoutCss}
        ${chatCardLayoutCss}
      `;
    }

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
        border-radius: var(--agy-card-radius, ${cardRadiusPx}px) !important;
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
        border-radius: ${bubbleTheme.isScroll ? '6px' : `var(--agy-card-radius, ${cardRadiusPx}px)`} !important;
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
        border-radius: ${bubbleTheme.isScroll ? '5px' : `calc(var(--agy-card-radius, ${cardRadiusPx}px) - 1px)`} !important;
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
        border-radius: calc(var(--agy-card-radius, ${cardRadiusPx}px) + 2px) !important;
        padding: 1.5px !important;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${bubbleTheme.glow} !important;
        position: relative !important;
      }

      .surface-composer-card {
        background: ${inputCardBg} !important;
        backdrop-filter: none !important;
        border-radius: var(--agy-card-radius, ${cardRadiusPx}px) !important;
        border: ${bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.07)'} !important;
      }
      ${uiDesignVarsCss}
      ${layoutCss}
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
      @keyframes agyPreviewCardShimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      @keyframes agyPreviewCardPulse {
        0%, 100% {
          box-shadow: 0 0 0 0 transparent;
        }
        50% {
          box-shadow: 0 0 0 2px ${mainTheme.glow}, 0 0 12px 2px ${mainTheme.glow}44;
        }
      }
      @keyframes agyPreviewStripFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes agyLiveStripScan {
        0% { transform: translateX(-100%); opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateX(400%); opacity: 0; }
      }
      @keyframes agyHudSpin {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.03); }
        100% { transform: rotate(360deg) scale(1); }
      }
      @keyframes agyParticleFloat {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.25; }
        50% { transform: translate3d(14px, -28px, 0) scale(1.15); opacity: 0.65; }
      }
      @keyframes agyParticleFall {
        0% { transform: translate3d(0, -32px, 0) rotate(0deg); opacity: 0.15; }
        50% { transform: translate3d(12px, 14px, 0) rotate(90deg); opacity: 0.7; }
        100% { transform: translate3d(-8px, 56px, 0) rotate(180deg); opacity: 0.12; }
      }
      @keyframes agyParticleRise {
        0% { transform: translate3d(0, 18px, 0) scale(0.9); opacity: 0.15; }
        50% { transform: translate3d(-10px, -24px, 0) scale(1.1); opacity: 0.7; }
        100% { transform: translate3d(8px, -54px, 0) scale(0.85); opacity: 0.12; }
      }
      @keyframes agyParticleOrbit {
        0% { transform: rotate(0deg) translate3d(18px, 0, 0) rotate(0deg); opacity: 0.28; }
        50% { transform: rotate(180deg) translate3d(18px, 0, 0) rotate(-180deg) scale(1.12); opacity: 0.72; }
        100% { transform: rotate(360deg) translate3d(18px, 0, 0) rotate(-360deg); opacity: 0.28; }
      }
      @keyframes agyParticlePulse {
        0%, 100% { transform: scale(0.78); opacity: 0.2; }
        50% { transform: scale(1.32); opacity: 0.78; }
      }
      @keyframes agyParticleDrift {
        0%, 100% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0.3; }
        50% { transform: translate3d(22px, 24px, 0) rotate(24deg); opacity: 0.65; }
      }
      @keyframes agyParticleTwinkle {
        0%, 100% { transform: scale(0.8); opacity: 0.18; }
        50% { transform: scale(1.25); opacity: 0.72; }
      }
      @keyframes agyIntroCheckIn {
        from { opacity: 0; transform: translate3d(-8px, 0, 0); }
        to { opacity: 1; transform: translate3d(0, 0, 0); }
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
      .agy-shell > #agy-live-bg-layer,
      #agy-live-bg-layer {
        display: block !important;
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #agy-live-bg-layer.agy-bg-hidden {
        display: none !important;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] > #agy-live-bg-layer {
        clip-path: var(--agy-hole-clip, none) !important;
      }
      .agy-shell [data-agy-greeting] {
        font-size: 0 !important;
        line-height: 0 !important;
        color: transparent !important;
        text-shadow: none !important;
      }
      .agy-shell [data-agy-greeting]::after {
        content: attr(data-agy-greeting);
        font-family: 'AgyTawaMali', 'Mali', 'Segoe Print', 'Comic Sans MS', cursive !important;
        font-size: clamp(22px, 2.15vw, 29px) !important;
        line-height: 1.44 !important;
        font-weight: 500 !important;
        color: ${isLight ? '#0f172a' : '#f8fafc'} !important;
        text-shadow: ${isLight ? '0 1px 2px rgba(255, 255, 255, 0.55)' : '0 2px 15px rgba(0, 0, 0, 0.85), 0 1px 4px rgba(0, 0, 0, 0.65)'} !important;
        display: block !important;
        text-align: center !important;
        letter-spacing: 0.01em !important;
        max-width: 820px;
        margin: 0 auto;
        white-space: normal !important;
      }
    `;

    const effectiveBlur = Number.isFinite(st.glassBlur) ? `${st.glassBlur}px` : (mainTheme.headerBlur || '3px');
    if (st.themeMode === 'dynamic' && st.wpEnabled) {
      syncVideoAndRevealLayer(st, mainTheme, wpUrl, wpVideoUrl, isVideoMode, overlayRgb, overlayAlpha, bgPosition, effectiveBlur);
    } else {
      clearRevealRaf();
      releaseVideoDecoder(document.getElementById('agy-live-bg-video'));
      const liveLayer = document.getElementById('agy-live-bg-layer');
      if (liveLayer) liveLayer.remove();
    }

    syncDynamicAuraElement(st.themeMode === 'dynamic', st.wpEnabled);
    syncDynamicFxLayer(st.themeMode === 'dynamic', mainTheme);
    syncDynamicHudWidgets(st.themeMode === 'dynamic', mainTheme);
    if (st.themeMode === 'static') {
      dismissThemeIntro();
      teardownBootOverlay();
    }
    syncEmptyGreeting(st);
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
    const fxLayer = document.getElementById('agy-dynamic-fx-layer');
    if (fxLayer) fxLayer.remove();
    removeDynamicHudWidgets();
    dismissThemeIntro();
    teardownBootOverlay();
    clearRevealRaf();
    releaseVideoDecoder(document.getElementById('agy-live-bg-video'));
    const liveBgLayer = document.getElementById('agy-live-bg-layer');
    if (liveBgLayer) liveBgLayer.remove();
    document.querySelectorAll('[data-agy-greeting]').forEach((el) => {
      el.removeAttribute('data-agy-greeting');
      delete el.dataset.agyGreetingOrig;
    });
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
  (() => {
    const st0 = getStateSafe();
    if (st0.themeMode === 'dynamic') {
      if (st0.bootIntro && !window.__AGY_BOOT_PLAYED__) {
        setTimeout(() => mountBootSequence(false), 120);
      } else if (st0.introEnabled && !window.__AGY_INTRO_SHOWN_ONCE__) {
        window.__AGY_INTRO_SHOWN_ONCE__ = true;
        const th0 = THEMES[st0.themeName] || THEMES[getDefaultThemeKey()] || {};
        setTimeout(() => showThemeIntro(th0, false), 250);
      }
    }
  })();

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
    syncExtraToggleBtns(primaryColor);
  }

  function syncExtraToggleBtns(primaryColor) {
    const st = getStateSafe();
    const accent = primaryColor || '#38bdf8';
    const voiceBtn = document.getElementById('agy-voice-toggle-btn');
    if (voiceBtn) {
      const on = !!st.voiceEnabled;
      voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      voiceBtn.style.borderColor = on ? accent : 'rgba(255, 255, 255, 0.12)';
      voiceBtn.style.color = on ? '#f4f4f5' : '#71717a';
      voiceBtn.style.background = on ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)';
      voiceBtn.innerHTML = on ? '🗣️ Giọng nói' : '🗣️ Tắt giọng';
    }
    const introBtn = document.getElementById('agy-intro-toggle-btn');
    if (introBtn) {
      const on = !!st.introEnabled;
      introBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      introBtn.style.borderColor = on ? accent : 'rgba(255, 255, 255, 0.12)';
      introBtn.style.color = on ? '#f4f4f5' : '#71717a';
      introBtn.style.background = on ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)';
      introBtn.innerHTML = on ? '✨ Intro' : '✨ Tắt Intro';
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
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
              <button id="agy-theme-mode-toggle" type="button" title="Chuyển chế độ Động / Tĩnh (Dynamic / Static)" style="display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 9999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); cursor: pointer; font-size: 12px; line-height: 1; user-select: none;">
                <span data-mode-pill="dynamic" style="padding: 5px 10px; border-radius: 9999px; transition: background-color 0.15s ease, color 0.15s ease;">⚡ Động</span>
                <span data-mode-pill="static" style="padding: 5px 10px; border-radius: 9999px; transition: background-color 0.15s ease, color 0.15s ease;">🧊 Tĩnh</span>
              </button>
              <button id="agy-voice-toggle-btn" type="button" title="Bật/tắt giọng nói chào mừng (Web Speech)" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #f4f4f5; cursor: pointer; font-size: 11.5px; white-space: nowrap; transition: all 0.15s ease;">
                🗣️ Giọng nói
              </button>
              <button id="agy-intro-toggle-btn" type="button" title="Bật/tắt Intro khởi động khi đổi theme" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #f4f4f5; cursor: pointer; font-size: 11.5px; white-space: nowrap; transition: all 0.15s ease;">
                ✨ Intro
              </button>
              <button id="agy-intro-preview-btn" type="button" title="Xem thử hiệu ứng Intro của theme hiện tại" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 8px; background: rgba(56, 189, 248, 0.16); border: 1px solid rgba(56, 189, 248, 0.35); color: #e0f2fe; cursor: pointer; font-size: 11.5px; font-weight: 600; white-space: nowrap; transition: all 0.15s ease;">
                ▶ Thử Intro
              </button>
              <button id="agy-boot-hud-btn" type="button" title="Chạy thử Starfield Boot HUD (boot.js)" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 8px; background: rgba(168, 85, 247, 0.18); border: 1px solid rgba(168, 85, 247, 0.38); color: #f3e8ff; cursor: pointer; font-size: 11.5px; font-weight: 600; white-space: nowrap; transition: all 0.15s ease;">
                ▶ Boot HUD
              </button>
              <button id="agy-sound-mute-btn" type="button" title="Bật/tắt âm thanh (Sound on/off)" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.15s ease;">
                🔊 <span id="agy-sound-mute-label">Âm thanh</span>
              </button>
              <input id="agy-sound-vol-slider" type="range" min="0" max="100" value="38" title="Âm lượng (Volume)" style="width: 60px; cursor: pointer; accent-color: #38bdf8; height: 4px; vertical-align: middle;" />
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
        playModeToggleSound(nextMode === 'dynamic');
        applyTheme({ themeMode: nextMode });
        const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
        syncThemeModeToggleBtn(nextMode, th.primary);
        // Re-render panels to refresh Dynamic/Static preview card indicators
        const body = backdrop.querySelector('#agy-theme-modal-body');
        if (body) renderThemePanels(body);
        if (nextMode === 'dynamic') {
          speakThemeVoice('Dynamic protocol engaged.', th);
        }
      });
      const voiceToggleBtn = backdrop.querySelector('#agy-voice-toggle-btn');
      if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener('click', () => {
          const cur = getState();
          const next = !cur.voiceEnabled;
          const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
          applyTheme({ voiceEnabled: next });
          syncExtraToggleBtns(th.primary);
          playClickSound(th);
          if (next) speakThemeVoice('Voice feedback enabled.', th);
        });
      }
      const introToggleBtn = backdrop.querySelector('#agy-intro-toggle-btn');
      if (introToggleBtn) {
        introToggleBtn.addEventListener('click', () => {
          const cur = getState();
          const next = !cur.introEnabled;
          const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
          applyTheme({ introEnabled: next });
          syncExtraToggleBtns(th.primary);
          playClickSound(th);
        });
      }
      const introPreviewBtn = backdrop.querySelector('#agy-intro-preview-btn');
      if (introPreviewBtn) {
        introPreviewBtn.addEventListener('click', () => {
          const cur = getState();
          const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
          if (cur.themeMode === 'static') {
            applyTheme({ themeMode: 'dynamic' });
            syncThemeModeToggleBtn('dynamic', th.primary);
            const body = backdrop.querySelector('#agy-theme-modal-body');
            if (body) renderThemePanels(body);
          }
          playThemeSelectSound(th.primary, th);
          showThemeIntro(th, true);
        });
      }
      const bootHudBtn = backdrop.querySelector('#agy-boot-hud-btn');
      if (bootHudBtn) {
        bootHudBtn.addEventListener('click', () => {
          const cur = getState();
          const th = THEMES[cur.themeName] || THEMES[getDefaultThemeKey()] || {};
          if (cur.themeMode === 'static') {
            applyTheme({ themeMode: 'dynamic' });
            syncThemeModeToggleBtn('dynamic', th.primary);
            const body = backdrop.querySelector('#agy-theme-modal-body');
            if (body) renderThemePanels(body);
          }
          backdrop.style.display = 'none';
          mountBootSequence(true);
        });
      }
      // Wire up sound mute button
      const soundMuteBtn = backdrop.querySelector('#agy-sound-mute-btn');
      const soundVolSlider = backdrop.querySelector('#agy-sound-vol-slider');
      if (soundMuteBtn) {
        // Initialize from storage
        const initMuted = localStorage.getItem(STORAGE_SOUND_MUTED) === 'true';
        const initVol = localStorage.getItem(STORAGE_SOUND_VOLUME);
        if (initMuted) {
          soundMuteBtn.innerHTML = '🔇 <span id="agy-sound-mute-label">Tắt tiếng</span>';
        }
        if (soundVolSlider && initVol !== null) {
          soundVolSlider.value = Math.round(parseFloat(initVol) * 100);
        }
        soundMuteBtn.addEventListener('click', () => {
          const curMuted = localStorage.getItem(STORAGE_SOUND_MUTED) === 'true';
          const nextMuted = !curMuted;
          localStorage.setItem(STORAGE_SOUND_MUTED, String(nextMuted));
          soundMuteBtn.innerHTML = nextMuted
            ? '🔇 <span id="agy-sound-mute-label">Tắt tiếng</span>'
            : '🔊 <span id="agy-sound-mute-label">Âm thanh</span>';
          if (!nextMuted) playClickSound();
        });
      }
      if (soundVolSlider) {
        soundVolSlider.addEventListener('input', (e) => {
          const vol = parseInt(e.target.value, 10) / 100;
          localStorage.setItem(STORAGE_SOUND_VOLUME, String(vol));
          if (vol > 0) localStorage.setItem(STORAGE_SOUND_MUTED, 'false');
          if (soundMuteBtn && vol > 0) {
            soundMuteBtn.innerHTML = '🔊 <span id="agy-sound-mute-label">Âm thanh</span>';
          }
          playClickSound();
        });
      }
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

    const wasOpen = backdrop.style.display === 'flex';
    backdrop.style.display = 'flex';
    const body = backdrop.querySelector('#agy-theme-modal-body');
    renderThemePanels(body);
    if (initialFile && typeof backdrop._handleAiFile === 'function') {
      backdrop._handleAiFile(initialFile);
    }
    if (!wasOpen) {
      const st = getStateSafe();
      if (st.themeMode !== 'static' && st.voiceEnabled) {
        const th = THEMES[st.themeName] || THEMES[getDefaultThemeKey()] || {};
        const pack = resolveDynamicPack(th);
        const line = pack.archetypeLabel ? `${pack.archetypeLabel} console accessed.` : 'System menu accessed.';
        speakThemeVoice(line, pack, { volumeScale: 0.7 });
      }
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
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #d4d4d8; cursor: pointer;">
                <input id="agy-sketch-reveal-toggle" type="checkbox" ${st.sketchReveal ? 'checked' : ''} style="accent-color: ${mainTheme.primary}; cursor: pointer;" />
                Sketch Reveal
              </label>
              <button id="agy-wp-mode-btn" type="button" title="Chuyển Video MP4 / Ảnh tĩnh" style="padding: 4px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                ${st.wpMode === 'video' ? '🎬 Video' : '🖼️ Image'}
              </button>
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
              <label style="padding: 5px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Custom Video
                <input id="agy-video-upload" type="file" accept="video/mp4,video/webm,.mp4,.webm" style="display: none;" />
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

        <div style="border: 1px solid ${mainTheme.borderColor}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #f4f4f5; margin-bottom: 2px;">Task Voice &amp; Custom Greeting (Mali Font)</div>
              <div style="font-size: 12px; color: #a1a1aa;">Play random voice clips on task completion and customize empty-chat greetings.</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #d4d4d8; cursor: pointer;">
                <input id="agy-task-voice-toggle" type="checkbox" ${st.taskVoiceEnabled ? 'checked' : ''} style="accent-color: ${mainTheme.primary}; cursor: pointer;" />
                Task Voice
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #a1a1aa;">
                Vol
                <input id="agy-task-voice-vol" type="range" min="0" max="100" value="${st.taskVoiceVol}" style="width: 72px; cursor: pointer; accent-color: ${mainTheme.primary}; height: 5px;" />
                <span id="agy-task-voice-vol-val" style="min-width: 30px;">${st.taskVoiceVol}%</span>
              </label>
              <button id="agy-task-voice-test" type="button" style="padding: 4px 10px; border-radius: 7px; background: rgba(255,255,255,0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer;">▶ Test Voice</button>
              <label style="padding: 4px 10px; border-radius: 7px; background: rgba(255,255,255,0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                + Audio (.mp3/.wav/.ogg)
                <input id="agy-task-voice-upload" type="file" accept="audio/*,.mp3,.wav,.ogg" style="display: none;" />
              </label>
            </div>
          </div>
          <div id="agy-task-voice-list" style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${st.taskVoices.length ? st.taskVoices.map((v) => `
              <span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); font-size: 11.5px; color: #e4e4e7;">
                <span>🎵 ${escHtml(v.name)}</span>
                <button class="agy-task-voice-play-one" data-url="${escHtml(v.url)}" type="button" style="background:none;border:none;color:${mainTheme.primary};cursor:pointer;font-size:11px;padding:0;">▶</button>
              </span>
            `).join('') : '<span style="font-size:11.5px;color:#71717a;">No task voice clips yet — upload .mp3/.wav/.ogg or drop into themes/user_media/.</span>'}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.07);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #d4d4d8; cursor: pointer;">
                <input id="agy-tawa-greeting-toggle" type="checkbox" ${st.tawaGreeting ? 'checked' : ''} style="accent-color: ${mainTheme.primary}; cursor: pointer;" />
                Custom Greeting (AgyTawaMali font)
              </label>
              <button id="agy-custom-greetings-save" type="button" style="padding: 4px 12px; border-radius: 7px; background: ${mainTheme.primary}; color: #090d16; font-weight: 600; font-size: 12px; border: none; cursor: pointer;">Save Greetings</button>
            </div>
            <textarea id="agy-custom-greetings-input" rows="2" placeholder="One greeting per line (e.g. Chào buổi sáng! Hôm nay mình build gì nào?)" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.32); color: #f4f4f5; border: 1px solid ${mainTheme.borderColor}; border-radius: 8px; padding: 7px 10px; font-size: 12.5px; resize: vertical;">${escHtml((st.customGreetings || []).join('\n'))}</textarea>
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
              const bubbleIdx = THEME_KEYS.indexOf(name);
              const dynBubbleAnim = st.themeMode === 'dynamic'
                ? `animation: agyPreviewCardPulse 4s ease-in-out infinite; animation-delay: ${(bubbleIdx % 4) * 0.55}s;`
                : 'animation: none;';
              const bubbleModeTag = st.themeMode === 'dynamic'
                ? `<span style="position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 700; color: ${th.primary || '#38bdf8'}; background: rgba(0,0,0,0.55); border-radius: 999px; padding: 1px 6px; border: 1px solid ${th.glow || 'rgba(56,189,248,0.4)'}; letter-spacing: 0.3px; pointer-events:none;">⚡</span>`
                : `<span style="position: absolute; top: 8px; left: 8px; font-size: 9px; font-weight: 700; color: #94a3b8; background: rgba(0,0,0,0.55); border-radius: 999px; padding: 1px 6px; border: 1px solid rgba(148,163,184,0.3); letter-spacing: 0.3px; pointer-events:none;">🧊</span>`;
              return `
                <div class="agy-bubble-card" data-name="${name}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSelected ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 24px 18px 14px 18px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 112px; transition: border-color 0.15s ease, background-color 0.15s ease; ${dynBubbleAnim}">
                  ${bubbleModeTag}
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

          <!-- Live Preview Strip: visually different in Dynamic vs Static -->
          ${(() => {
            const activePack = resolveDynamicPack(mainTheme);
            return st.themeMode === 'dynamic' ? `
          <div id="agy-live-preview-strip" style="position: relative; overflow: hidden; border-radius: 10px; height: 36px; margin-bottom: 14px; background: linear-gradient(90deg, ${mainTheme.glow}, ${mainTheme.secondaryGlow || mainTheme.primary}, ${mainTheme.glow}); background-size: 300% 100%; animation: agyPreviewStripFlow 4s ease-in-out infinite; display: flex; align-items: center; padding: 0 16px; gap: 10px; border: 1px solid ${mainTheme.borderColor};">
            <span style="position: absolute; left: 0; top: 0; bottom: 0; width: 25%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: agyLiveStripScan 2.4s ease-in-out infinite; pointer-events: none;"></span>
            <span style="font-size: 12px; font-weight: 700; color: #090d16; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">⚡ ${escHtml(activePack.archetypeLabel)}</span>
            <span style="font-size: 11px; color: rgba(0,0,0,0.75); margin-left: 4px;">${escHtml(activePack.uiDesign.layoutPreset)} · ${escHtml(activePack.uiDesign.sidebarStyle)} · ${escHtml(activePack.uiDesign.composerStyle)} · ${escHtml(activePack.uiDesign.chatCardLayout)}</span>
            <span style="margin-left: auto; font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.65); background: rgba(255,255,255,0.32); border-radius: 999px; padding: 2px 8px;">ANIMATE ON</span>
          </div>
          ` : `
          <div id="agy-live-preview-strip" style="border-radius: 10px; height: 36px; margin-bottom: 14px; background: rgba(30, 30, 35, 0.72); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 16px; gap: 10px;">
            <span style="font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px;">🧊 Static</span>
            <span style="font-size: 11px; color: #64748b; margin-left: 4px;">Tắt mọi hiệu ứng · Tiết kiệm pin &amp; GPU</span>
            <span style="margin-left: auto; font-size: 11px; font-weight: 600; color: #64748b; background: rgba(255,255,255,0.06); border-radius: 999px; padding: 2px 8px; border: 1px solid rgba(255,255,255,0.1);">MOTION OFF</span>
          </div>
          `;
          })()}

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${THEME_KEYS.map(name => {
              const th = THEMES[name];
              const cardPack = resolveDynamicPack(th);
              const isSelected = name === st.themeName;
              const canDelete = THEME_KEYS.length > 1;
              const isBuiltin = BUILTIN_KEYS.has(name);
              const thumbRaw = th.wallpaper || th.posterUrl || '';
              const thumbUrl = thumbRaw ? resolveMediaUrl(thumbRaw) : '';
              const thumbBg = thumbUrl
                ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(14,12,12,0.85)), url('${thumbUrl}')`
                : (th.pureBg || th.bg);
              const thumbOrnamentStyle = th.isOrnament
                ? 'right: 10px; bottom: 8px; width: 76px; height: 24px; background-position: center;'
                : 'right: 12px; bottom: 4px; width: 42px; height: 38px; background-position: bottom center;';
              // Dynamic mode: shimmer + pulse border animation on cards
              const dynCardStyle = st.themeMode === 'dynamic'
                ? `animation: agyPreviewCardPulse 3.5s ease-in-out infinite; animation-delay: ${(THEME_KEYS.indexOf(name) % 4) * 0.6}s;`
                : 'animation: none;';
              const dynThumbExtra = st.themeMode === 'dynamic'
                ? `<div style="position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.08) 50%, transparent 80%); background-size: 200% 100%; animation: agyPreviewCardShimmer 2.5s linear infinite; animation-delay: ${(THEME_KEYS.indexOf(name) % 4) * 0.4}s; pointer-events: none;"></div>`
                : '';
              const modeIndicator = st.themeMode === 'dynamic'
                ? `<span style="position: absolute; bottom: 8px; left: 10px; z-index: 2; font-size: 10px; font-weight: 700; color: ${th.primary || '#38bdf8'}; background: rgba(0,0,0,0.65); border-radius: 999px; padding: 1px 7px; border: 1px solid ${th.glow || 'rgba(56,189,248,0.4)'}; letter-spacing: 0.3px;">⚡ ${escHtml(cardPack.archetypeLabel)}</span>`
                : `<span style="position: absolute; bottom: 8px; left: 10px; z-index: 2; font-size: 10px; font-weight: 700; color: #94a3b8; background: rgba(0,0,0,0.65); border-radius: 999px; padding: 1px 7px; border: 1px solid rgba(148,163,184,0.3); letter-spacing: 0.3px;">🧊 Static</span>`;
              const packTags = st.themeMode === 'dynamic'
                ? `<div style="font-size: 10.5px; color: #71717a; margin-top: 2px;">${escHtml(cardPack.uiDesign.layoutPreset)} · ${escHtml(cardPack.uiDesign.sidebarStyle)} / ${escHtml(cardPack.uiDesign.composerStyle)} / ${escHtml(cardPack.uiDesign.chatCardLayout)}</div>`
                : '';
              const cardUi = cardPack.uiDesign || { cardRadiusPx: 12, borderStyle: 'solid', fontVibe: 'sans' };
              const cardRadius = Number.isFinite(cardUi.cardRadiusPx) ? cardUi.cardRadiusPx : 12;
              const cardBorderStyle = cardUi.borderStyle === 'double' ? 'double' : (cardUi.borderStyle === 'dashed' ? 'dashed' : 'solid');
              const cardBorderWidth = cardUi.borderStyle === 'double' ? '3px' : (isSelected ? '1.5px' : '1px');
              const cardBorderColor = isSelected ? '#f4f4f5' : (cardUi.borderStyle === 'glow-frame' ? (th.primary || 'rgba(255,255,255,0.28)') : 'rgba(255, 255, 255, 0.14)');
              const cardClip = cardUi.borderStyle === 'chamfered'
                ? 'clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px); border-radius: 0;'
                : `border-radius: ${cardRadius}px;`;
              const cardFont = getFontVibeStack(cardUi.fontVibe);
              return `
                <div class="agy-preset-card" data-name="${escHtml(name)}" style="position: relative; ${cardClip} border: ${cardBorderWidth} ${cardBorderStyle} ${cardBorderColor}; background: rgba(14, 12, 12, 0.82); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: border-color 0.15s ease; font-family: ${cardFont}; ${dynCardStyle}">
                  ${canDelete ? `<button class="agy-delete-preset-btn" data-del-preset="${escHtml(name)}" type="button" title="${isBuiltin ? 'Ẩn preset gốc' : 'Xóa preset'}" style="position: absolute; top: 8px; right: 8px; z-index: 3; width: 26px; height: 26px; border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.22); background: rgba(10, 12, 18, 0.72); color: #fca5a5; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease;">🗑️</button>` : ''}
                  <div style="height: 68px; width: 100%; background-image: ${thumbBg}; background-size: cover; background-position: ${th.bgPosition || 'center'}; position: relative; display: flex; align-items: flex-end; padding: 8px 14px;">
                    ${dynThumbExtra}
                    ${th.sticker ? `<div style="position: absolute; ${thumbOrnamentStyle} background-image: url('${th.sticker}'); background-size: contain; background-repeat: no-repeat; pointer-events: none;"></div>` : ''}
                    ${modeIndicator}
                    <span style="font-size: 13.5px; font-weight: 600; color: #fff; position: relative; z-index: 1;">${escHtml(name)}</span>
                  </div>
                  <div style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="font-size: 12px; color: #a1a1aa;">${escHtml(th.concept || '')}</span>
                      ${packTags}
                    </div>
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

    const sketchRevealToggle = container.querySelector('#agy-sketch-reveal-toggle');
    if (sketchRevealToggle) {
      sketchRevealToggle.addEventListener('change', (e) => {
        applyTheme({ sketchReveal: e.target.checked });
      });
    }

    const wpModeBtn = container.querySelector('#agy-wp-mode-btn');
    if (wpModeBtn) {
      wpModeBtn.addEventListener('click', () => {
        const cur = getState();
        const nextMode = cur.wpMode === 'video' ? 'image' : 'video';
        applyTheme({ wpMode: nextMode });
        wpModeBtn.textContent = nextMode === 'video' ? '🎬 Video' : '🖼️ Image';
      });
    }

    const wpUpload = container.querySelector('#agy-wp-upload');
    wpUpload.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        applyTheme({ customWp: reader.result, wpEnabled: true, wpMode: 'image' });
        const toggle = container.querySelector('#agy-wp-toggle');
        if (toggle) toggle.checked = true;
        if (wpModeBtn) wpModeBtn.textContent = '🖼️ Image';
      };
      reader.readAsDataURL(file);
    });

    const videoUpload = container.querySelector('#agy-video-upload');
    if (videoUpload) {
      videoUpload.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const base = (typeof window !== 'undefined' && window.__AGY_MEDIA_BASE_URL__)
          ? String(window.__AGY_MEDIA_BASE_URL__).replace(/\/+$/, '')
          : MEDIA_BASE;
        try {
          const resp = await fetch(`${base}/upload?kind=video&name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'video/mp4' },
            body: file
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.url) {
              const savedVideos = upsertSavedMedia('video', { url: data.url, name: file.name, addedAt: Date.now() });
              applyTheme({ customVideo: data.url, savedVideos, wpEnabled: true, wpMode: 'video', themeMode: 'dynamic' });
              if (wpModeBtn) wpModeBtn.textContent = '🎬 Video';
              return;
            }
          }
        } catch (err) {}
      });
    }

    const taskVoiceToggle = container.querySelector('#agy-task-voice-toggle');
    if (taskVoiceToggle) {
      taskVoiceToggle.addEventListener('change', (e) => {
        applyTheme({ taskVoiceEnabled: e.target.checked });
      });
    }
    const taskVoiceVol = container.querySelector('#agy-task-voice-vol');
    const taskVoiceVolVal = container.querySelector('#agy-task-voice-vol-val');
    if (taskVoiceVol) {
      taskVoiceVol.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (taskVoiceVolVal) taskVoiceVolVal.textContent = v + '%';
        applyTheme({ taskVoiceVol: v });
      });
    }
    const taskVoiceTest = container.querySelector('#agy-task-voice-test');
    if (taskVoiceTest) {
      taskVoiceTest.addEventListener('click', () => playRandomTaskVoice(true));
    }
    container.querySelectorAll('.agy-task-voice-play-one').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stCur = getState();
        playOneShotTaskAudio(btn.dataset.url, stCur.taskVoiceVol);
      });
    });
    const taskVoiceUpload = container.querySelector('#agy-task-voice-upload');
    if (taskVoiceUpload) {
      taskVoiceUpload.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const base = (typeof window !== 'undefined' && window.__AGY_MEDIA_BASE_URL__)
          ? String(window.__AGY_MEDIA_BASE_URL__).replace(/\/+$/, '')
          : MEDIA_BASE;
        try {
          const resp = await fetch(`${base}/upload?kind=audio&name=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'audio/mpeg' },
            body: file
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.url) {
              const taskVoices = upsertSavedMedia('audio', { url: data.url, name: file.name, addedAt: Date.now() });
              applyTheme({ taskVoices, taskVoiceEnabled: true });
              renderThemePanels(container);
              return;
            }
          }
        } catch (err) {}
      });
    }
    const tawaGreetingToggle = container.querySelector('#agy-tawa-greeting-toggle');
    if (tawaGreetingToggle) {
      tawaGreetingToggle.addEventListener('change', (e) => {
        applyTheme({ tawaGreeting: e.target.checked });
      });
    }
    const customGreetingsSave = container.querySelector('#agy-custom-greetings-save');
    const customGreetingsInput = container.querySelector('#agy-custom-greetings-input');
    if (customGreetingsSave && customGreetingsInput) {
      customGreetingsSave.addEventListener('click', () => {
        const lines = normalizeGreetingLines(String(customGreetingsInput.value || '').split(/\r?\n/));
        window.__AGY_GREETING_NEED_FRESH__ = true;
        applyTheme({ customGreetings: lines, tawaGreeting: true });
        if (tawaGreetingToggle) tawaGreetingToggle.checked = true;
      });
    }

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
          const keys = ['themeName', 'bubbleName', 'inputStyle', 'dimming', 'wpEnabled', 'customWp', 'userAvatar', 'agentAvatar', 'glassBlur', 'avatarSize', 'avatarRadius', 'themeMode', 'soundMuted', 'soundVolume', 'voiceEnabled', 'introEnabled'];
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
      localStorage.removeItem(STORAGE_SOUND_MUTED);
      localStorage.removeItem(STORAGE_SOUND_VOLUME);
      localStorage.removeItem(STORAGE_VOICE_ENABLED);
      localStorage.removeItem(STORAGE_INTRO_ENABLED);
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
        themeMode: 'dynamic',
        voiceEnabled: true,
        introEnabled: true
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
        const th = THEMES[name] || {};
        const curSt = getState();
        playThemeSelectSound(th.primary, th);
        const nextWpMode = (th.wallpaperVideo || th.videoUrl) ? 'video' : 'image';
        applyTheme({ themeName: name, bubbleName: name, customWp: '', customVideo: '', wpMode: nextWpMode });
        if (wpModeBtn) wpModeBtn.textContent = nextWpMode === 'video' ? '🎬 Video' : '🖼️ Image';
        if (curSt.themeMode !== 'static') {
          const pack = resolveDynamicPack(th);
          if (curSt.introEnabled) {
            showThemeIntro(th, false);
          } else {
            speakThemeVoice(pack.voiceSwitch, pack);
          }
        }

        container.querySelectorAll('.agy-preset-card').forEach(c => {
          const isSel = c.dataset.name === name;
          c.style.borderColor = isSel ? '#f4f4f5' : 'rgba(255, 255, 255, 0.14)';
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
        const th = THEMES[name] || {};
        playClickSound();
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
    let ar = 0, ag = 0, ab = 0, n = 0, transparent = 0;
    const B = 24;
    const buckets = Array.from({ length: B }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) {
        // Mostly-transparent images (logos, stickers, PNG with alpha):
        // count them against the dark glass they will sit on, instead of
        // dropping them and letting a few opaque pixels skew the average.
        transparent++;
        ar += 10; ag += 14; ab += 24; n++;
        continue;
      }
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
      // Grayscale / monochrome / pastel / near-white / near-black images:
      // no saturated hue bucket exists, so derive the accent from the
      // average colour itself (boost saturation) instead of a flat grey.
      // A near-grey average has no real hue (HSV hue defaults to red),
      // so use slate blue (210°) instead of an arbitrary reddish tint.
      const [ah0, as, av] = rgbToHsv(avg[0], avg[1], avg[2]);
      const ah = as < 0.08 ? 210 : ah0;
      primary = hsvToRgb(ah, Math.max(as, 0.45), Math.min(0.98, Math.max(av, 0.75)));
      secondary = hsvToRgb(ah + 40, Math.max(as, 0.35), Math.min(0.96, Math.max(av, 0.7)));
    }
    primary = tune(primary, 0.45, 0.75, 0.98);
    secondary = tune(secondary, 0.35, 0.70, 0.96);
    const overlay = avg.map((x) => Math.max(4, Math.min(22, Math.round(x * 0.1))));
    return { avg, lum, isLight, primary, secondary, overlay, transparentRatio: transparent / Math.max(1, n) };
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
    t.dynamicPack = resolveDynamicPack(t);
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
    if (file.type === 'image/svg+xml') throw new Error('Ảnh SVG không hỗ trợ — hãy gửi PNG, JPG, WebP, GIF hoặc AVIF');
    if (file.size && file.size > 50 * 1024 * 1024) throw new Error('Ảnh quá lớn (>50MB) — hãy gửi bản nhỏ hơn');
    const { img, url } = await loadImageFromFile(file);
    try {
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      if (!sw || !sh) throw new Error('Không đọc được kích thước ảnh');
      if (onStatus) {
        onStatus('AI đang vẽ tranh mới chuẩn 4K 16:9 theo chủ đề ảnh gốc và thiết kế bảng màu (khoảng 1–2 phút)…');
      }
      let res = null, aiError = '';
      try {
        res = await requestAiDesign({ image: encodeSourceForAi(img), width: sw, height: sh });
        if (!res || !res.wallpaperDataUrl) throw new Error('AI không trả về ảnh 4K 16:9');
      } catch (e) {
        // Any-image fallback: AI (agy) missing, not logged in, timed out or
        // failed must NOT lose the user's image. Fall through to the local
        // palette path below instead of throwing.
        aiError = e && e.message ? String(e.message) : String(e);
        res = null;
      }
      if (res) {
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
      }
      // ── Local fallback (no AI): palette + 4K cover from the original image ──
      if (onStatus) onStatus('AI không khả dụng — đang tạo theme từ palette của ảnh gốc…');
      const palLocal = analyzePalette(img);
      const wallpaperLocal = finalize4k16x9Wallpaper(img).dataUrl;
      const themeLocal = buildThemeFromPalette(palLocal, wallpaperLocal, 'Auto Palette');
      let baseLocal = (file.name || 'My Theme').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 24) || 'My Theme';
      let nameLocal = baseLocal, j = 2;
      while (THEMES[nameLocal]) nameLocal = `${baseLocal} ${j++}`;
      const allLocal = loadCustomThemes();
      allLocal[nameLocal] = themeLocal;
      const namesLocal = Object.keys(allLocal);
      while (namesLocal.length > MAX_CUSTOM_THEMES) {
        const old = namesLocal.shift();
        delete allLocal[old]; delete THEMES[old];
        const ix = THEME_KEYS.indexOf(old); if (ix >= 0) THEME_KEYS.splice(ix, 1);
      }
      THEMES[nameLocal] = themeLocal;
      if (!THEME_KEYS.includes(nameLocal)) THEME_KEYS.push(nameLocal);
      persistCustomThemes(allLocal);
      applyTheme({ themeName: nameLocal, bubbleName: nameLocal, customWp: '' });
      return {
        name: nameLocal,
        pal: { primary: hexToRgbList(themeLocal.primary), secondary: hexToRgbList(themeLocal.secondary), overlay: themeLocal.overlayRgb.split(',').map((x) => parseInt(x, 10)), isLight: false },
        wallpaper: wallpaperLocal,
        aiNote: aiError ? `AI không dùng được (${aiError.slice(0, 120)}), đã tạo bằng palette tự động.` : 'AI không dùng được, đã tạo bằng palette tự động.',
        ai: false,
        wpMeta: { width: 3840, height: 2160, aiOutpainted: false }
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

  function pickTawaGreeting() {
    const st = getState();
    const pool = Array.isArray(st.customGreetings) ? st.customGreetings.filter(Boolean) : [];
    if (!pool.length) return '';
    const prev = window.__AGY_LAST_GREETING__;
    const choices = pool.length > 1 ? pool.filter(s => s !== prev) : pool;
    const picked = choices[Math.floor(Math.random() * choices.length)] || pool[0];
    window.__AGY_LAST_GREETING__ = picked;
    return picked;
  }

  function syncEmptyGreeting(stOverride) {
    const st = stOverride || getState();
    const hasCustom = Array.isArray(st.customGreetings) && st.customGreetings.some(Boolean);
    if (!st.tawaGreeting || !hasCustom) {
      if (window.__AGY_GREETING_ACTIVE__) {
        window.__AGY_GREETING_ACTIVE__ = false;
        document.querySelectorAll('[data-agy-greeting]').forEach((el) => {
          el.removeAttribute('data-agy-greeting');
          delete el.dataset.agyGreetingOrig;
        });
      }
      return;
    }
    const shell = findActiveShell();
    if (!shell) return;
    const root = shell.querySelector('[data-main-content-body="true"]') || shell;
    const hasChat = Boolean(root.querySelector('[data-testid="agent-response"], .agy-user-bubble-frame'));
    if (hasChat) {
      window.__AGY_GREETING_NEED_FRESH__ = true;
      return;
    }
    const candidates = root.querySelectorAll('h1, h2, h3, p, div, span');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.children.length > 0) continue;
      if (el.closest('.surface-composer, [data-testid="agent-response"], .agy-user-bubble-frame, .settings-modal-container, #agy-custom-theme-modal-backdrop, .bg-sidebar, [class*="@container/titlebar"], pre, code, button, input, textarea')) {
        continue;
      }
      const txt = (el.textContent || '').trim();
      if (!txt || txt.length > 85) continue;
      if (!GREETING_RX.test(txt)) continue;
      if (!el.hasAttribute('data-agy-greeting') || window.__AGY_GREETING_NEED_FRESH__ || el.dataset.agyGreetingOrig !== txt) {
        el.dataset.agyGreetingOrig = txt;
        el.setAttribute('data-agy-greeting', pickTawaGreeting());
        window.__AGY_GREETING_NEED_FRESH__ = false;
      }
      window.__AGY_GREETING_ACTIVE__ = true;
      break;
    }
  }

  const taskVoiceState = {
    wasRunning: false,
    lastUrl: location.href,
    urlChangedAt: 0,
    userCancelledAt: 0,
    lastPlayedUrl: ''
  };

  function stopTaskAudio() {
    const audio = window.__AGY_TASK_AUDIO__;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {}
      window.__AGY_TASK_AUDIO__ = null;
    }
  }

  function playOneShotTaskAudio(rawUrl, volPercent = 85) {
    const resolved = resolveMediaUrl(rawUrl);
    if (!resolved) return;
    stopTaskAudio();
    try {
      const audio = new Audio(resolved);
      audio.volume = Math.max(0, Math.min(1, (Number.isFinite(Number(volPercent)) ? Number(volPercent) : 85) / 100));
      window.__AGY_TASK_AUDIO__ = audio;
      const cleanup = () => {
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch (e) {}
        if (window.__AGY_TASK_AUDIO__ === audio) {
          window.__AGY_TASK_AUDIO__ = null;
        }
      };
      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('error', cleanup, { once: true });
      audio.play().catch(cleanup);
    } catch (e) {}
  }

  function playRandomTaskVoice(ignoreEnabled = false) {
    const st = getState();
    if (!ignoreEnabled && !st.taskVoiceEnabled) return;
    const pool = getMediaLibrary('audio');
    if (pool.length === 0) return;
    const choices = pool.length > 1
      ? pool.filter((item) => !isSameMediaUrl(item.url, taskVoiceState.lastPlayedUrl))
      : pool;
    const picked = choices[Math.floor(Math.random() * choices.length)] || pool[0];
    if (!picked || !picked.url) return;
    taskVoiceState.lastPlayedUrl = picked.url;
    playOneShotTaskAudio(picked.url, st.taskVoiceVol);
  }
  window.__ANTIGRAVITY_TEST_TASK_VOICE__ = () => playRandomTaskVoice(true);

  function syncTaskCompletionVoice() {
    if (location.href !== taskVoiceState.lastUrl) {
      taskVoiceState.lastUrl = location.href;
      taskVoiceState.urlChangedAt = Date.now();
      taskVoiceState.wasRunning = false;
      if (window.__AGY_TASK_COMPLETE_TIMER__) {
        clearTimeout(window.__AGY_TASK_COMPLETE_TIMER__);
        window.__AGY_TASK_COMPLETE_TIMER__ = null;
      }
      return;
    }
    const shell = findActiveShell();
    if (!shell) return;
    const isRunning = Boolean(shell.querySelector('[data-testid="input-cancel-button"]'));
    if (isRunning) {
      if (window.__AGY_TASK_COMPLETE_TIMER__) {
        clearTimeout(window.__AGY_TASK_COMPLETE_TIMER__);
        window.__AGY_TASK_COMPLETE_TIMER__ = null;
      }
      taskVoiceState.wasRunning = true;
      return;
    }
    if (!taskVoiceState.wasRunning || window.__AGY_TASK_COMPLETE_TIMER__) return;
    window.__AGY_TASK_COMPLETE_TIMER__ = setTimeout(() => {
      window.__AGY_TASK_COMPLETE_TIMER__ = null;
      const curShell = findActiveShell();
      if (!curShell || curShell.querySelector('[data-testid="input-cancel-button"]')) {
        return;
      }
      taskVoiceState.wasRunning = false;
      const now = Date.now();
      if (location.href !== taskVoiceState.lastUrl) return;
      if (now - taskVoiceState.urlChangedAt < 1200) return;
      if (now - taskVoiceState.userCancelledAt < 1800) return;
      if (!curShell.querySelector('[data-testid="agent-response"]')) return;
      playRandomTaskVoice(false);
    }, 450);
  }

  window.__AGY_INTERNAL__ = {
    THEMES, BOOT_ASSETS, THEME_KEYS, DEFAULT_THEME_KEY,
    STORAGE_THEME, STORAGE_BUBBLE, STORAGE_INPUT, STORAGE_DIMMING,
    STORAGE_WP_ENABLED, STORAGE_WP_MODE, STORAGE_CUSTOM_WP, STORAGE_CUSTOM_VIDEO,
    STORAGE_TASK_VOICE_ENABLED, STORAGE_TASK_VOICE_VOL, STORAGE_CUSTOM_GREETINGS,
    STORAGE_USER_AVATAR, STORAGE_AGENT_AVATAR, STORAGE_GLASS_BLUR,
    STORAGE_AVATAR_SIZE, STORAGE_AVATAR_RADIUS, STORAGE_BOOT_INTRO,
    STORAGE_SKETCH_REVEAL, STORAGE_TAWA_GREETING,
    CHECK_SVG,
    escapeHtml: escHtml, canonicalMediaKey, isSameMediaUrl, deriveMediaName,
    getMediaLibrary, upsertSavedMedia, removeSavedMediaFromStore,
    normalizeGreetingLines, getState, resolveMediaUrl, sanitizeCssUrl,
    findActiveShell, clearRevealRaf, clearBootTimers, stopBootAudio,
    teardownBootOverlay, scheduleRevealWhenReady, applyTheme,
    syncEmptyGreeting, playOneShotTaskAudio, playRandomTaskVoice,
    mountBootSequence, triggerSketchBloomReveal
  };

  function tick() {
    injectTopbarButton();
    injectMainSidebarButton();
    injectSettingsModalButton();
    hookSidebarScroll();
    hookShellMetrics();
    syncEmptyGreeting();
    syncTaskCompletionVoice();
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
  if (window.__AGY_TASK_COMPLETE_TIMER__) {
    clearTimeout(window.__AGY_TASK_COMPLETE_TIMER__);
    window.__AGY_TASK_COMPLETE_TIMER__ = null;
  }
  window.__AGY_SCROLL_AC__ = new AbortController();
  document.addEventListener('click', (e) => {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('[data-testid="input-cancel-button"]')) {
      taskVoiceState.userCancelledAt = Date.now();
    }
  }, { capture: true, signal: window.__AGY_SCROLL_AC__.signal });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && String(e.key || '').toLowerCase() === 'd') {
      taskVoiceState.userCancelledAt = Date.now();
    }
  }, { capture: true, signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('load', () => { scheduleTitleBarSync(); injectTopbarButton(); }, { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('focus', () => { syncTitleBarOverlay(); injectTopbarButton(); }, { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('popstate', () => scheduleTick(), { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('hashchange', () => scheduleTick(), { signal: window.__AGY_SCROLL_AC__.signal });
  document.addEventListener('visibilitychange', () => {
    const vid = document.getElementById('agy-live-bg-video');
    if (document.hidden) {
      if (vid && !vid.paused) {
        vid.dataset.agyPausedByHidden = '1';
        try { vid.pause(); } catch (e) {}
      }
      return;
    }
    syncTitleBarOverlay();
    injectTopbarButton();
    if (vid && vid.dataset.agyPausedByHidden === '1') {
      delete vid.dataset.agyPausedByHidden;
      const cur = getState();
      if (cur.themeMode === 'dynamic' && cur.wpEnabled && cur.wpMode !== 'image' && vid.getAttribute('data-src')) {
        vid.play().catch(() => {});
      }
    }
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