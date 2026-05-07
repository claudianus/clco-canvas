import { CellBuffer } from "../buffer/cell-buffer.js";
import type { Rgb } from "../types.js";
import { ease } from "../animation/easing.js";
import { mixRgb } from "../style/theme.js";

export type TransitionEffect = "slide" | "dissolve" | "wipe" | "matrix" | "spiral" | "glitch" | "pixelate";

const ALL_EFFECTS: TransitionEffect[] = ["slide", "dissolve", "wipe", "matrix", "spiral", "glitch", "pixelate"];

export function getTransitionEffectNames(): TransitionEffect[] {
  return ALL_EFFECTS;
}

export function normalizeTransitionEffect(name?: string): TransitionEffect {
  if (name && ALL_EFFECTS.includes(name as TransitionEffect)) return name as TransitionEffect;
  return "slide";
}

// ---- Helpers ----

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- Standard blend (for simple crossfade) ----

function blendCell(a: { ch: string; style: { fg?: Rgb; bg?: Rgb } }, b: { ch: string; style: { fg?: Rgb; bg?: Rgb } }, t: number): { ch: string; style: { fg?: Rgb; bg?: Rgb } } {
  if (t >= 1) return b;
  if (t <= 0) return a;
  const alpha = ease("easeOutCubic", t);
  const ch = alpha > 0.5 ? b.ch : a.ch;
  const fg: Rgb | undefined = a.style.fg || b.style.fg
    ? [
        Math.round((a.style.fg?.[0] ?? 0) + ((b.style.fg?.[0] ?? 0) - (a.style.fg?.[0] ?? 0)) * alpha),
        Math.round((a.style.fg?.[1] ?? 0) + ((b.style.fg?.[1] ?? 0) - (a.style.fg?.[1] ?? 0)) * alpha),
        Math.round((a.style.fg?.[2] ?? 0) + ((b.style.fg?.[2] ?? 0) - (a.style.fg?.[2] ?? 0)) * alpha),
      ]
    : undefined;
  const bg: Rgb | undefined = a.style.bg || b.style.bg
    ? [
        Math.round((a.style.bg?.[0] ?? 0) + ((b.style.bg?.[0] ?? 0) - (a.style.bg?.[0] ?? 0)) * alpha),
        Math.round((a.style.bg?.[1] ?? 0) + ((b.style.bg?.[1] ?? 0) - (a.style.bg?.[1] ?? 0)) * alpha),
        Math.round((a.style.bg?.[2] ?? 0) + ((b.style.bg?.[2] ?? 0) - (a.style.bg?.[2] ?? 0)) * alpha),
      ]
    : undefined;
  return { ch, style: { fg, bg } };
}

// ---- Effect implementations ----

interface BlendOptions {
  target: CellBuffer;  // new screen
  source: CellBuffer;  // old screen
  progress: number;
  direction: -1 | 1;
  accent: Rgb;
}

function blendSlide(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction, accent } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));
  const splitX = Math.round(eased * w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fromTarget = direction === 1 ? x >= w - splitX : x < splitX;
      const cell = fromTarget ? target.get(x, y) : source.get(x, y);
      if (cell) result.set(x, y, cell.ch, cell.style);

      const splitPos = direction === 1 ? w - splitX : splitX;
      if (x === splitPos && cell) {
        const glowBg = mixRgb(cell.style.bg ?? [0, 0, 0], accent, 0.35);
        result.set(x, y, cell.ch, { ...cell.style, bg: glowBg });
      }
    }
  }
  return result;
}

function blendDissolve(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));
  const rand = mulberry32(Math.round(progress * 1000));

  // Fill with source first, then randomly replace with target
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = source.get(x, y);
      if (src) result.set(x, y, src.ch, src.style);
    }
  }

  // Random cells from target appear based on progress
  const cellCount = Math.floor(w * h);
  for (let i = 0; i < cellCount; i++) {
    if (rand() < eased * 1.3) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      const tgt = target.get(x, y);
      if (tgt && (tgt.ch !== " " || tgt.style.bg || tgt.style.fg)) {
        const src = result.get(x, y);
        const blended = blendCell(src ?? { ch: " ", style: {} }, tgt, 0.7 + rand() * 0.3);
        result.set(x, y, blended.ch, blended.style);
      }
    }
  }

  return result;
}

function blendWipe(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction, accent } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeInOutCubic", Math.max(0, Math.min(1, progress)));

  // direction=1: wipe right, direction=-1: wipe left
  const wipePos = direction === 1 ? Math.round(eased * w) : Math.round((1 - eased) * w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fromTarget = direction === 1 ? x < wipePos : x > wipePos;
      const cell = fromTarget ? target.get(x, y) : source.get(x, y);
      if (cell) result.set(x, y, cell.ch, cell.style);

      // Glow bar at wipe line
      if (Math.abs(x - wipePos) <= 1 && cell) {
        const glowAlpha = 1 - Math.abs(x - wipePos);
        const glowBg = mixRgb(cell.style.bg ?? [0, 0, 0], accent, 0.4 * glowAlpha);
        result.set(x, y, cell.ch, { ...cell.style, bg: glowBg });
      }
    }
  }
  return result;
}

function blendMatrix(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction, accent } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));
  const MATRIX_CHARS = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃ0123456789";
  const rand = mulberry32(42);

  // Fill with target first
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tgt = target.get(x, y);
      if (tgt) result.set(x, y, tgt.ch, tgt.style);
    }
  }

  // Source screen "dissolves" into matrix rain from the edge
  const splitX = Math.round(eased * w);
  const dissolveZone = direction === 1 ? w - splitX : splitX;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inZone = direction === 1 ? x >= w - dissolveZone : x < dissolveZone;
      if (!inZone) continue;

      const zoneProgress = direction === 1
        ? (x - (w - dissolveZone)) / Math.max(1, dissolveZone)
        : (dissolveZone - x) / Math.max(1, dissolveZone);

      if (rand() < zoneProgress * 0.5) {
        const ch = MATRIX_CHARS[Math.floor(rand() * MATRIX_CHARS.length)];
        const charFg: Rgb = [Math.round(zoneProgress * 40), Math.round(zoneProgress * 255), Math.round(zoneProgress * 80)];
        result.set(x, y, ch, { fg: charFg, bg: [0, zoneProgress * 20, 0] as Rgb });
      } else if (rand() < zoneProgress * 0.3) {
        const src = source.get(x, y);
        if (src) result.set(x, y, src.ch, src.style);
      }
    }
  }

  // Glow at matrix boundary
  const glowX = direction === 1 ? w - dissolveZone : dissolveZone;
  for (let y = 0; y < h; y++) {
    if (glowX >= 0 && glowX < w) {
      const cell = result.get(glowX, y);
      if (cell) {
        result.set(glowX, y, cell.ch, { ...cell.style, bg: mixRgb(cell.style.bg ?? [0, 0, 0], accent, 0.5) });
      }
    }
  }

  return result;
}

function blendSpiral(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));

  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const spiralPhase = (dist / maxDist + angle / (Math.PI * 2)) % 1;

      // direction=1: spiral outward from center
      // direction=-1: spiral inward toward center
      const threshold = direction === 1 ? eased : 1 - eased;
      const fromTarget = spiralPhase < threshold;
      const cell = fromTarget ? target.get(x, y) : source.get(x, y);
      if (cell) result.set(x, y, cell.ch, cell.style);
    }
  }
  return result;
}

function blendGlitch(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));
  const rand = mulberry32(77);

  // Fill with target first
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tgt = target.get(x, y);
      if (tgt) result.set(x, y, tgt.ch, tgt.style);
    }
  }

  // Glitch blocks from source screen
  const glitchIntensity = (1 - eased) * 0.6;
  const numGlitches = Math.floor(glitchIntensity * h);
  for (let g = 0; g < numGlitches; g++) {
    const gy = Math.floor(rand() * h);
    const gh = 1 + Math.floor(rand() * 4);
    const gShift = Math.floor((rand() - 0.5) * w * glitchIntensity * 2);
    for (let dy = 0; dy < gh && gy + dy < h; dy++) {
      const y = gy + dy;
      for (let x = 0; x < w; x++) {
        const srcX = x - gShift;
        if (srcX >= 0 && srcX < w) {
          const src = source.get(srcX, y);
          if (src) result.set(x, y, src.ch, src.style);
        }
      }
    }
  }

  // RGB split at the transition edge
  const splitX = Math.round(eased * w);
  for (let y = 0; y < h; y++) {
    const edge = splitX + Math.floor((rand() - 0.5) * 8);
    if (edge >= 0 && edge < w) {
      const cell = result.get(edge, y);
      if (cell) {
        result.set(edge, y, cell.ch, { ...cell.style, fg: [255, 50, 50] as Rgb });
      }
      if (edge + 2 < w) {
        const cell2 = result.get(edge + 2, y);
        if (cell2) result.set(edge + 2, y, cell2.ch, { ...cell2.style, fg: [50, 50, 255] as Rgb });
      }
    }
  }

  return result;
}

function blendPixelate(opts: BlendOptions): CellBuffer {
  const { target, source, progress, direction } = opts;
  const w = target.width;
  const h = target.height;
  const result = new CellBuffer(w, h);
  const eased = ease("easeOutCubic", Math.max(0, Math.min(1, progress)));
  const rand = mulberry32(55);

  // Block size decreases as transition progresses
  const maxBlockSize = Math.max(2, Math.round((1 - eased) * 20));
  const blockSize = maxBlockSize;

  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      // Each block randomly picks source or target
      const fromTarget = rand() < eased;
      for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
          const x = bx + dx;
          const y = by + dy;
          const cell = fromTarget ? target.get(x, y) : source.get(x, y);
          if (cell) result.set(x, y, cell.ch, cell.style);
        }
      }
    }
  }

  return result;
}

const EFFECT_IMPLS: Record<TransitionEffect, (opts: BlendOptions) => CellBuffer> = {
  slide: blendSlide,
  dissolve: blendDissolve,
  wipe: blendWipe,
  matrix: blendMatrix,
  spiral: blendSpiral,
  glitch: blendGlitch,
  pixelate: blendPixelate,
};

// ---- Main blend dispatch ----

export function blendTransition(effect: TransitionEffect, opts: BlendOptions): CellBuffer {
  const impl = EFFECT_IMPLS[effect];
  if (impl) return impl(opts);
  return blendSlide(opts);
}

export { blendSlide };
