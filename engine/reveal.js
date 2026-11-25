window.__AGY_LAZY_REVEAL__ = function(ctx, instant = false) {
  const { findActiveShell, getState, clearRevealRaf } = ctx;
  function parseObjPosRatio(posStr) {
    const parts = String(posStr || '50% 50%').trim().split(/\s+/);
    const mapTok = (tok, def) => {
      if (!tok) return def;
      if (tok === 'left' || tok === 'top') return 0;
      if (tok === 'center') return 0.5;
      if (tok === 'right' || tok === 'bottom') return 1;
      if (tok.endsWith('%')) {
        const v = parseFloat(tok);
        return Number.isFinite(v) ? Math.max(0, Math.min(1, v / 100)) : def;
      }
      return def;
    };
    return [mapTok(parts[0], 0.5), mapTok(parts[1] || parts[0], 0.5)];
  }

  function simplifyChainRDPFlat(ptsX, ptsY, count, epsSq) {
    if (count <= 3) {
      const out = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        out[i * 2] = ptsX[i];
        out[i * 2 + 1] = ptsY[i];
      }
      return out;
    }
    const keep = new Uint8Array(count);
    keep[0] = 1;
    keep[count - 1] = 1;
    const stack = [[0, count - 1]];
    while (stack.length > 0) {
      const [s, e] = stack.pop();
      if (e - s <= 1) continue;
      const ax = ptsX[s];
      const ay = ptsY[s];
      const dx = ptsX[e] - ax;
      const dy = ptsY[e] - ay;
      const lenSq = dx * dx + dy * dy;
      let maxD = 0;
      let maxI = -1;
      for (let i = s + 1; i < e; i++) {
        const px = ptsX[i] - ax;
        const py = ptsY[i] - ay;
        let dSq;
        if (lenSq < 1e-9) {
          dSq = px * px + py * py;
        } else {
          const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
          const cx = px - t * dx;
          const cy = py - t * dy;
          dSq = cx * cx + cy * cy;
        }
        if (dSq > maxD) {
          maxD = dSq;
          maxI = i;
        }
      }
      if (maxD > epsSq && maxI > s) {
        keep[maxI] = 1;
        stack.push([s, maxI], [maxI, e]);
      }
    }
    let kept = 0;
    for (let i = 0; i < count; i++) if (keep[i]) kept++;
    const out = new Float32Array(kept * 2);
    let k = 0;
    for (let i = 0; i < count; i++) {
      if (keep[i]) {
        out[k++] = ptsX[i];
        out[k++] = ptsY[i];
      }
    }
    return out;
  }

  function extractStrokesJS(mediaEl, targetW = 1280, targetH = 800, objPosStr = '50% 50%', maxStrokes = 1380) {
    const strokes = [];
    try {
      const srcW = mediaEl.videoWidth || mediaEl.naturalWidth || 0;
      const srcH = mediaEl.videoHeight || mediaEl.naturalHeight || 0;
      if (srcW > 0 && srcH > 0) {
        const viewAspect = Math.max(0.4, Math.min(3.5, targetW / Math.max(1, targetH)));
        const w = 920;
        const h = Math.max(240, Math.round(w / viewAspect));
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (octx) {
          // Match exact CSS object-fit: cover + object-position crop so every contour aligns 1:1 with the video/image
          const [rx, ry] = parseObjPosRatio(objPosStr);
          const srcAspect = srcW / srcH;
          let sx = 0, sy = 0, sw = srcW, sh = srcH;
          if (srcAspect > viewAspect) {
            sw = srcH * viewAspect;
            sx = Math.max(0, (srcW - sw) * rx);
          } else if (srcAspect < viewAspect) {
            sh = srcW / viewAspect;
            sy = Math.max(0, (srcH - sh) * ry);
          }
          octx.imageSmoothingEnabled = true;
          octx.imageSmoothingQuality = 'medium';
          octx.drawImage(mediaEl, sx, sy, sw, sh, 0, 0, w, h);

          const data = octx.getImageData(0, 0, w, h).data;
          off.width = 0;
          off.height = 0;
          const totalPx = w * h;
          // Uint16Array scaled x8 preserves sub-unit accuracy at half the RAM of Float32Array
          const mag = new Uint16Array(totalPx);
          const dirBin = new Uint8Array(totalPx);
          let maxMag = 8;
          const rowBytes = w * 4;
          for (let y = 2; y < h - 2; y++) {
            const row = y * w;
            const rTopBase = (y - 1) * rowBytes;
            const rMidBase = y * rowBytes;
            const rBotBase = (y + 1) * rowBytes;

            let p0 = rTopBase + 4, p1 = rMidBase + 4, p2 = rBotBase + 4;
            let sR0 = data[p0] + 2 * data[p1] + data[p2], dR0 = data[p2] - data[p0];
            let sG0 = data[p0 + 1] + 2 * data[p1 + 1] + data[p2 + 1], dG0 = data[p2 + 1] - data[p0 + 1];
            let sB0 = data[p0 + 2] + 2 * data[p1 + 2] + data[p2 + 2], dB0 = data[p2 + 2] - data[p0 + 2];

            p0 += 4; p1 += 4; p2 += 4;
            let sR1 = data[p0] + 2 * data[p1] + data[p2], dR1 = data[p2] - data[p0];
            let sG1 = data[p0 + 1] + 2 * data[p1 + 1] + data[p2 + 1], dG1 = data[p2 + 1] - data[p0 + 1];
            let sB1 = data[p0 + 2] + 2 * data[p1 + 2] + data[p2 + 2], dB1 = data[p2 + 2] - data[p0 + 2];

            for (let x = 2; x < w - 2; x++) {
              const rxPos = (x + 1) * 4;
              const q0 = rTopBase + rxPos, q1 = rMidBase + rxPos, q2 = rBotBase + rxPos;
              const sR2 = data[q0] + 2 * data[q1] + data[q2], dR2 = data[q2] - data[q0];
              const sG2 = data[q0 + 1] + 2 * data[q1 + 1] + data[q2 + 1], dG2 = data[q2 + 1] - data[q0 + 1];
              const sB2 = data[q0 + 2] + 2 * data[q1 + 2] + data[q2 + 2], dB2 = data[q2 + 2] - data[q0 + 2];

              const gxR = sR2 - sR0, gyR = dR0 + 2 * dR1 + dR2;
              const gxG = sG2 - sG0, gyG = dG0 + 2 * dG1 + dG2;
              const gxB = sB2 - sB0, gyB = dB0 + 2 * dB1 + dB2;

              sR0 = sR1; sR1 = sR2; dR0 = dR1; dR1 = dR2;
              sG0 = sG1; sG1 = sG2; dG0 = dG1; dG1 = dG2;
              sB0 = sB1; sB1 = sB2; dB0 = dB1; dB1 = dB2;

              const gxL = 0.299 * gxR + 0.587 * gxG + 0.114 * gxB;
              const gyL = 0.299 * gyR + 0.587 * gyG + 0.114 * gyB;
              const gx1 = gxR - gxG;
              const gy1 = gyR - gyG;
              const gx2 = 0.5 * (gxR + gxG) - gxB;
              const gy2 = 0.5 * (gyR + gyG) - gyB;

              const lSq = gxL * gxL + gyL * gyL;
              const c1Sq = gx1 * gx1 + gy1 * gy1;
              const c2Sq = gx2 * gx2 + gy2 * gy2;
              // Stronger chroma weight preserves isoluminant anime iris boundaries (e.g. gold/pink vs white sclera)
              const m = Math.sqrt(lSq + 0.90 * (c1Sq + c2Sq));
              const mScaled = m > 8191 ? 65535 : Math.round(m * 8);
              const idx = row + x;
              mag[idx] = mScaled;
              if (mScaled > maxMag) maxMag = mScaled;

              let gx = gxL, gy = gyL;
              if (0.90 * c1Sq > lSq && c1Sq >= c2Sq) { gx = gx1; gy = gy1; }
              else if (0.90 * c2Sq > lSq && c2Sq > c1Sq) { gx = gx2; gy = gy2; }
              const ax = Math.abs(gx);
              const ay = Math.abs(gy);
              if (ax > ay * 2.414) dirBin[idx] = 0;
              else if (ay > ax * 2.414) dirBin[idx] = 2;
              else dirBin[idx] = (gx * gy >= 0) ? 1 : 3;
            }
          }

          // Canny NMS + 8x5 spatial tile peak tracking so soft foreground corners aren't drowned by global high-contrast areas
          const nms = new Uint16Array(totalPx);
          const bins = new Int32Array(128);
          const GRID_X = 8, GRID_Y = 5;
          const tileMax = new Uint16Array(GRID_X * GRID_Y);
          let nmsCount = 0;
          const margin = 3;
          const noiseFloor = 7 * 8;
          for (let y = margin; y < h - margin; y++) {
            const row = y * w;
            const ty = Math.min(GRID_Y - 1, Math.floor((y * GRID_Y) / h));
            for (let x = margin; x < w - margin; x++) {
              const i = row + x;
              const m = mag[i];
              if (m < noiseFloor) continue;
              const d = dirBin[i];
              let m1 = 0, m2 = 0;
              if (d === 0) { m1 = mag[i - 1]; m2 = mag[i + 1]; }
              else if (d === 2) { m1 = mag[i - w]; m2 = mag[i + w]; }
              else if (d === 1) { m1 = mag[i - w - 1]; m2 = mag[i + w + 1]; }
              else { m1 = mag[i - w + 1]; m2 = mag[i + w - 1]; }
              if (m >= m1 && m >= m2) {
                nms[i] = m;
                const b = Math.min(127, Math.floor((m / maxMag) * 127));
                bins[b]++;
                nmsCount++;
                const tx = Math.min(GRID_X - 1, Math.floor((x * GRID_X) / w));
                const tIdx = ty * GRID_X + tx;
                if (m > tileMax[tIdx]) tileMax[tIdx] = m;
              }
            }
          }

          let targetEdges = Math.max(140, Math.floor(nmsCount * 0.17));
          let hiBin = 22;
          for (let b = 127; b >= 1; b--) {
            targetEdges -= bins[b];
            if (targetEdges <= 0) {
              hiBin = b;
              break;
            }
          }
          const hiThresh = Math.max(20 * 8, (hiBin / 127) * maxMag);
          const loThresh = Math.max(10 * 8, hiThresh * 0.34);

          const tileSeed = new Uint16Array(GRID_X * GRID_Y);
          const tileFollow = new Uint16Array(GRID_X * GRID_Y);
          for (let ty = 0; ty < GRID_Y; ty++) {
            for (let tx = 0; tx < GRID_X; tx++) {
              const tIdx = ty * GRID_X + tx;
              const nx = (tx + 0.5) / GRID_X;
              const ny = (ty + 0.5) / GRID_Y;
              const inFocal = nx >= 0.25 && nx <= 0.75 && ny >= 0.20 && ny <= 0.78;
              const tmax = tileMax[tIdx];
              const minFloor = inFocal ? 22 * 8 : 26 * 8;
              const adaptCap = inFocal ? hiThresh * 0.30 : hiThresh * 0.34;
              const seed = tmax < minFloor ? 65535 : Math.max(minFloor, Math.min(adaptCap, tmax * 0.20));
              tileSeed[tIdx] = Math.round(seed);
              tileFollow[tIdx] = Math.max(7 * 8, Math.round(seed * 0.42));
            }
          }

          const visited = dirBin;
          visited.fill(0);
          const dirs = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
          const candidates = [];

          // Reusable flat typed scratch buffers prevent creating tens of thousands of [x, y] tuples during tracing
          const MAX_HALF = 140;
          const fwdX = new Int16Array(MAX_HALF);
          const fwdY = new Int16Array(MAX_HALF);
          const revX = new Int16Array(MAX_HALF);
          const revY = new Int16Array(MAX_HALF);
          const chainX = new Float32Array(MAX_HALF * 2 + 2);
          const chainY = new Float32Array(MAX_HALF * 2 + 2);
          const smX = new Float32Array(MAX_HALF * 2 + 2);
          const smY = new Float32Array(MAX_HALF * 2 + 2);

          function traceHalf(startX, startY, initDx, initDy, minEdge, outX, outY) {
            let cx = startX, cy = startY;
            let tanX = initDx, tanY = initDy;
            let steps = 0, energy = 0;
            while (steps < MAX_HALF) {
              let bestX = -1, bestY = -1, bestScore = -1;
              const tanLen = (tanX === 0 && tanY === 0) ? 0 : Math.hypot(tanX, tanY);
              for (let d = 0; d < 8; d++) {
                const dx = dirs[d][0];
                const dy = dirs[d][1];
                const dot = tanLen === 0 ? 1 : (dx * tanX + dy * tanY);
                // Smoothed EMA tangent keeps curved eye irises & circles continuous across 1px raster steps without U-turns
                if (tanLen > 0 && dot < -0.18 * tanLen) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < margin || nx >= w - margin || ny < margin || ny >= h - margin) continue;
                const ni = ny * w + nx;
                const nVal = nms[ni];
                if (visited[ni] || nVal < minEdge) continue;
                const align = tanLen === 0 ? 1.0 : (1.0 + 0.55 * (dot / tanLen));
                const sc = nVal * align;
                if (sc > bestScore) {
                  bestScore = sc;
                  bestX = nx;
                  bestY = ny;
                }
              }

              if (bestX < 0 && tanLen > 0) {
                const ux = Math.round(tanX / tanLen);
                const uy = Math.round(tanY / tanLen);
                const gx2 = cx + ux * 2;
                const gy2 = cy + uy * 2;
                if (gx2 >= margin && gx2 < w - margin && gy2 >= margin && gy2 < h - margin) {
                  const gi = gy2 * w + gx2;
                  if (!visited[gi] && nms[gi] >= minEdge * 0.85) {
                    bestX = gx2;
                    bestY = gy2;
                  }
                }
              }

              if (bestX < 0) break;
              const bi = bestY * w + bestX;
              visited[bi] = 1;
              outX[steps] = bestX;
              outY[steps] = bestY;
              energy += nms[bi];
              const stepX = bestX - cx;
              const stepY = bestY - cy;
              tanX = tanLen === 0 ? stepX : (tanX * 0.52 + stepX * 0.48);
              tanY = tanLen === 0 ? stepY : (tanY * 0.52 + stepY * 0.48);
              cx = bestX;
              cy = bestY;
              steps++;
            }
            return { len: steps, energy };
          }

          function collectPass(mode) {
            for (let y = margin; y < h - margin; y++) {
              const ty = Math.min(GRID_Y - 1, Math.floor((y * GRID_Y) / h));
              for (let x = margin; x < w - margin; x++) {
                const sIdx = y * w + x;
                if (visited[sIdx]) continue;
                const val = nms[sIdx];
                let seedThresh, followThresh;
                if (mode === 1) {
                  const tx = Math.min(GRID_X - 1, Math.floor((x * GRID_X) / w));
                  const tIdx = ty * GRID_X + tx;
                  seedThresh = tileSeed[tIdx];
                  followThresh = tileFollow[tIdx];
                } else if (mode === 2) {
                  seedThresh = 21 * 8;
                  followThresh = 9 * 8;
                } else {
                  seedThresh = hiThresh;
                  followThresh = loThresh;
                }
                if (val < seedThresh) continue;

                visited[sIdx] = 1;
                const fwd = traceHalf(x, y, 0, 0, followThresh, fwdX, fwdY);
                let rev = { len: 0, energy: 0 };
                if (fwd.len > 0) {
                  const initDx = x - fwdX[0];
                  const initDy = y - fwdY[0];
                  rev = traceHalf(x, y, initDx, initDy, followThresh, revX, revY);
                }

                const totalLen = rev.len + 1 + fwd.len;
                const totalEnergy = val + fwd.energy + rev.energy;
                const avgEnergy = totalEnergy / totalLen;

                // Mode 2 mines long coherent low-contrast curves (white-on-snow silhouettes, soft jawlines) while ignoring short grain
                if (mode === 2) {
                  if (totalLen < 18) continue;
                } else {
                  const crispDotFloor = Math.max(48 * 8, hiThresh * 0.50);
                  const minLen = (avgEnergy >= crispDotFloor) ? 3 : 6;
                  if (totalLen < minLen) continue;
                }

                let p = 0;
                for (let i = rev.len - 1; i >= 0; i--) { chainX[p] = revX[i]; chainY[p] = revY[i]; p++; }
                chainX[p] = x; chainY[p] = y; p++;
                for (let i = 0; i < fwd.len; i++) { chainX[p] = fwdX[i]; chainY[p] = fwdY[i]; p++; }

                smX[0] = chainX[0]; smY[0] = chainY[0];
                smX[totalLen - 1] = chainX[totalLen - 1]; smY[totalLen - 1] = chainY[totalLen - 1];
                for (let i = 1; i < totalLen - 1; i++) {
                  smX[i] = 0.25 * chainX[i - 1] + 0.5 * chainX[i] + 0.25 * chainX[i + 1];
                  smY[i] = 0.25 * chainY[i - 1] + 0.5 * chainY[i] + 0.25 * chainY[i + 1];
                }

                const flatPx = simplifyChainRDPFlat(smX, smY, totalLen, 0.68);
                const vertCount = flatPx.length / 2;
                if (vertCount < 2) continue;

                for (let i = 0; i < flatPx.length; i += 2) {
                  flatPx[i] /= w;
                  flatPx[i + 1] /= h;
                }
                const midIdx = Math.floor(vertCount / 2) * 2;
                const nx = flatPx[midIdx];
                const ny = flatPx[midIdx + 1];
                const distSq = (nx - 0.5) * (nx - 0.5) * 1.3 + (ny - 0.45) * (ny - 0.45) * 1.4;
                const gentleBias = 0.68 + 0.70 * Math.exp(-distSq / 0.22);
                const eyeFocusBoost = (nx >= 0.34 && nx <= 0.66 && ny >= 0.32 && ny <= 0.60 && totalLen <= 18) ? 1.38 : 1.0;
                flatPx.w = Math.max(0.18, Math.min(1, avgEnergy / Math.max(1, hiThresh * 1.45)));

                const cTx = Math.min(GRID_X - 1, Math.floor(nx * GRID_X));
                const cTy = Math.min(GRID_Y - 1, Math.floor(ny * GRID_Y));
                candidates.push({
                  pts: flatPx,
                  score: avgEnergy * Math.pow(totalLen, 0.72) * gentleBias * eyeFocusBoost,
                  distCenter: Math.hypot(nx - 0.5, ny - 0.43),
                  cell: cTy * GRID_X + cTx
                });
              }
            }
          }

          collectPass(0);
          collectPass(1);
          collectPass(2);

          candidates.sort((a, b) => b.score - a.score);
          const picked = [];
          const usedIdx = new Uint8Array(candidates.length);
          const cellCounts = new Int32Array(GRID_X * GRID_Y);
          const cellQuota = Math.max(12, Math.floor((maxStrokes * 0.60) / (GRID_X * GRID_Y)));

          for (let i = 0; i < candidates.length && picked.length < maxStrokes; i++) {
            const c = candidates[i];
            if (cellCounts[c.cell] < cellQuota) {
              cellCounts[c.cell]++;
              usedIdx[i] = 1;
              picked.push(c);
            }
          }
          for (let i = 0; i < candidates.length && picked.length < maxStrokes; i++) {
            if (!usedIdx[i]) picked.push(candidates[i]);
          }

          picked.sort((a, b) => a.distCenter - b.distCenter);
          for (let i = 0; i < picked.length; i++) {
            strokes.push(picked[i].pts);
          }
        }
      }
    } catch (e) {}

    if (strokes.length < 18) {
      for (let i = 0; i < 48; i++) {
        const t = i / 48;
        const bx = 0.14 + 0.72 * ((i * 37) % 100) / 100;
        const by = 0.16 + 0.68 * ((i * 53) % 100) / 100;
        const len = 0.08 + 0.14 * Math.sin(t * Math.PI);
        const ang = (i * 0.7) % Math.PI;
        const fallback = new Float32Array([
          bx, by,
          bx + Math.cos(ang) * len * 0.5, by + Math.sin(ang) * len * 0.5 - 0.03,
          bx + Math.cos(ang) * len, by + Math.sin(ang) * len
        ]);
        fallback.w = 0.65;
        strokes.push(fallback);
      }
    }
    return strokes;
  }

  function createBloomSeeds() {
    const baseRegions = [
      [54, 42], [26, 28], [74, 66], [24, 72],
      [76, 26], [46, 74], [16, 46], [84, 48]
    ];
    return baseRegions.map(([bx, by], idx) => ({
      x: Math.max(10, Math.min(90, bx + (Math.random() - 0.5) * 14)),
      y: Math.max(10, Math.min(90, by + (Math.random() - 0.5) * 14)),
      delay: idx === 0 ? 0 : idx < 3 ? 0.1 + idx * 0.1 : 0.28 + (idx - 3) * 0.08,
      speed: 0.95 + Math.random() * 0.2
    }));
  }

  function triggerSketchBloomReveal(instant = false) {
    clearRevealRaf();
    const st = getState();
    const layer = document.getElementById('agy-live-bg-layer');
    const mediaWrap = document.getElementById('agy-live-media-wrap');
    const canvas = document.getElementById('agy-sketch-reveal-canvas');
    const videoEl = document.getElementById('agy-live-bg-video');
    const imgEl = document.getElementById('agy-live-bg-img');
    if (!layer || !mediaWrap || !canvas) return;

    const isVideoMode = st.wpMode === 'video';
    if (!st.wpEnabled) {
      canvas.width = 0;
      canvas.height = 0;
      canvas.style.display = 'none';
      layer.classList.add('agy-bg-hidden');
      return;
    }

    if (instant || !st.sketchReveal) {
      canvas.width = 0;
      canvas.height = 0;
      canvas.style.display = 'none';
      mediaWrap.style.webkitMaskImage = 'none';
      mediaWrap.style.maskImage = 'none';
      layer.style.background = 'transparent';
      if (isVideoMode && videoEl && videoEl.getAttribute('data-src')) {
        layer.classList.remove('agy-bg-hidden');
        if (videoEl.paused && videoEl.src) {
          videoEl.play().catch(() => {});
        }
      } else {
        layer.classList.add('agy-bg-hidden');
      }
      return;
    }

    const shell = findActiveShell();
    if (shell) shell.classList.add('agy-revealing');
    layer.classList.remove('agy-bg-hidden');
    layer.style.background = '#06080e';
    canvas.style.display = 'block';
    const rect = (shell || layer).getBoundingClientRect();
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const cw = Math.max(320, Math.round((rect.width || window.innerWidth) * dpr));
    const ch = Math.max(240, Math.round((rect.height || window.innerHeight) * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pick live frame or static image for contour extraction with exact cover-crop matching
    const activeMedia = (isVideoMode && videoEl && videoEl.readyState >= 2)
      ? videoEl
      : (imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : null);
    const objPos = activeMedia ? (getComputedStyle(activeMedia).objectPosition || '50% 50%') : '50% 50%';
    let strokes = activeMedia ? extractStrokesJS(activeMedia, rect.width || window.innerWidth, rect.height || window.innerHeight, objPos, 1380) : extractStrokesJS({});
    const seeds = createBloomSeeds();

    let cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = cw;
    cacheCanvas.height = ch;
    let cacheCtx = cacheCanvas.getContext('2d');
    if (cacheCtx) {
      cacheCtx.fillStyle = '#06080e';
      cacheCtx.fillRect(0, 0, cw, ch);
      cacheCtx.lineCap = 'round';
      cacheCtx.lineJoin = 'round';
    }
    let drawnSettled = 0;
    let fullCacheReady = false;

    window.__AGY_REVEAL_CLEANUP__ = () => {
      strokes = null;
      if (cacheCanvas) {
        cacheCanvas.width = 0;
        cacheCanvas.height = 0;
        cacheCanvas = null;
        cacheCtx = null;
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas.style.display = 'none';
      }
    };

    mediaWrap.style.webkitMaskImage = 'none';
    mediaWrap.style.maskImage = 'none';
    if (isVideoMode && videoEl && videoEl.paused && videoEl.src) {
      videoEl.play().catch(() => {});
    }

    const sketchDur = 2100;
    const bloomDur = 2150;
    const start = performance.now();

    function strokeOnePath(targetCtx, pts, wFactor, isFresh) {
      if (!pts || pts.length < 4) return;
      const vertCount = pts.length >> 1;
      const alpha = isFresh ? 0.96 : (0.48 + 0.40 * wFactor);
      targetCtx.strokeStyle = isFresh ? `rgba(255, 255, 255, ${alpha})` : `rgba(232, 239, 252, ${alpha.toFixed(2)})`;
      targetCtx.lineWidth = (0.64 + 0.78 * wFactor) * dpr;
      targetCtx.beginPath();
      targetCtx.moveTo(pts[0] * cw, pts[1] * ch);
      if (vertCount === 2) {
        targetCtx.lineTo(pts[2] * cw, pts[3] * ch);
      } else {
        for (let k = 1; k < vertCount - 1; k++) {
          const xk = pts[k * 2] * cw;
          const yk = pts[k * 2 + 1] * ch;
          const mx = (xk + pts[k * 2 + 2] * cw) * 0.5;
          const my = (yk + pts[k * 2 + 3] * ch) * 0.5;
          targetCtx.quadraticCurveTo(xk, yk, mx, my);
        }
        const lastOff = (vertCount - 1) * 2;
        targetCtx.lineTo(pts[lastOff] * cw, pts[lastOff + 1] * ch);
      }
      targetCtx.stroke();
    }

    function drawStrokesProgress(p) {
      const total = strokes ? strokes.length : 0;
      const count = p >= 1 ? total : Math.max(1, Math.floor(total * p));
      if (cacheCtx && cacheCanvas) {
        if (p >= 1) {
          if (!fullCacheReady && strokes) {
            for (let i = drawnSettled; i < total; i++) {
              const pts = strokes[i];
              const wFactor = (pts && typeof pts.w === 'number') ? pts.w : 0.6;
              strokeOnePath(cacheCtx, pts, wFactor, false);
            }
            drawnSettled = total;
            fullCacheReady = true;
          }
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(cacheCanvas, 0, 0);
          return;
        }
        if (!strokes) return;
        const settleLimit = Math.max(0, count - 18);
        while (drawnSettled < settleLimit) {
          const pts = strokes[drawnSettled];
          const wFactor = (pts && typeof pts.w === 'number') ? pts.w : 0.6;
          strokeOnePath(cacheCtx, pts, wFactor, false);
          drawnSettled++;
        }
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(cacheCanvas, 0, 0);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = drawnSettled; i < count; i++) {
          const pts = strokes[i];
          const wFactor = (pts && typeof pts.w === 'number') ? pts.w : 0.6;
          strokeOnePath(ctx, pts, wFactor, true);
        }
        ctx.restore();
        return;
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, cw, ch);
      if (!strokes) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < count; i++) {
        const pts = strokes[i];
        const wFactor = (pts && typeof pts.w === 'number') ? pts.w : 0.6;
        strokeOnePath(ctx, pts, wFactor, i > count - 18);
      }
      ctx.restore();
    }

    function applySeedBloom(bp) {
      const diag = Math.hypot(cw, ch);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < seeds.length; i++) {
        const sd = seeds[i];
        const raw = (bp - sd.delay) / (1 - sd.delay);
        if (raw <= 0) continue;
        const lp = Math.min(1, raw * sd.speed);
        const eased = lp < 0.5 ? 2 * lp * lp : 1 - Math.pow(-2 * lp + 2, 2) / 2;
        const rad = eased * diag * 0.46;
        const cx = (sd.x / 100) * cw;
        const cy = (sd.y / 100) * ch;
        const g = ctx.createRadialGradient(cx, cy, Math.max(0, rad * 0.45), cx, cy, Math.max(1, rad));
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawStrokesProgress(0.01);

    function step(now) {
      const elapsed = now - start;
      if (elapsed <= sketchDur) {
        drawStrokesProgress(Math.min(1, elapsed / sketchDur));
      } else {
        const bp = Math.min(1, (elapsed - sketchDur) / bloomDur);
        drawStrokesProgress(1);
        if (fullCacheReady) strokes = null;
        applySeedBloom(bp);
      }
      if (elapsed < sketchDur + bloomDur) {
        window.__AGY_REVEAL_RAF__ = requestAnimationFrame(step);
      } else {
        window.__AGY_REVEAL_RAF__ = null;
        document.querySelectorAll('.agy-shell.agy-revealing').forEach((el) => el.classList.remove('agy-revealing'));
        if (typeof window.__AGY_REVEAL_CLEANUP__ === 'function') {
          try { window.__AGY_REVEAL_CLEANUP__(); } catch (e) {}
          window.__AGY_REVEAL_CLEANUP__ = null;
        }
        mediaWrap.style.webkitMaskImage = 'none';
        mediaWrap.style.maskImage = 'none';
        layer.style.background = 'transparent';
        if (!isVideoMode || !videoEl || !videoEl.getAttribute('data-src')) {
          layer.classList.add('agy-bg-hidden');
        }
      }
    }

    window.__AGY_REVEAL_RAF__ = requestAnimationFrame(step);
  }
  return triggerSketchBloomReveal(instant);
};
