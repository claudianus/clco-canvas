import type { CellBuffer } from "../buffer/cell-buffer.js";
import type { Rect, Rgb, Style, Tone } from "../types.js";
import { clamp01, ease, tween } from "../animation/easing.js";
import { mixRgb } from "../style/theme.js";

export const vfxEffectNames = [
  "ripple",
  "vortex-spiral",
  "starburst",
  "kaleidoscope",
  "comet-tail",
  "lightning-branch",
  "magnetic-field",
  "scan-bloom",
  "glitch-shimmer",
  "data-rain",
  "circuit-ignite",
  "fire-ring",
  "gravity-well",
  "hex-hive",
  "diamond-rain",
  "nebula-pulse",
  "pixel-storm",
  "frost-crack",
  "chroma-spark",
  "spectrum-shear",
  "page-curl",
  "heartbeat",
  "constellation",
  "tide-pull",
  "lensflare-slit",
] as const;

export type VfxEffectName = typeof vfxEffectNames[number];

export interface VfxPalette {
  primary: Rgb;
  secondary: Rgb;
  accent: Rgb;
  text: Rgb;
  surface?: Rgb;
}

export interface VfxEffectOptions {
  rect: Rect;
  originX: number;
  originY: number;
  progress: number;
  name?: string;
  seed?: number;
  palette: VfxPalette;
  tone?: Tone;
  strength?: number;
}

interface VfxSample {
  alpha: number;
  colorMix: number;
  bgAlpha: number;
  bold: boolean;
}

export interface CellRippleOptions {
  rect: Rect;
  originX: number;
  originY: number;
  progress: number;
  tone?: Tone;
  fgFrom: Rgb;
  fgTo: Rgb;
  bg?: Rgb;
  radius?: number;
  thickness?: number;
  strength?: number;
}

export function drawCellRipple(buf: CellBuffer, options: CellRippleOptions): void {
  const rect = clampRect(options.rect, buf.width, buf.height);
  if (rect.w <= 0 || rect.h <= 0) return;
  const progress = ease("easeOutCubic", options.progress);
  if (progress <= 0 || progress >= 1.08) return;
  const maxRadius = options.radius ?? Math.hypot(rect.w, rect.h);
  const head = progress * maxRadius;
  const thickness = Math.max(0.75, options.thickness ?? Math.max(1.2, maxRadius * 0.12));
  const strength = clamp01(options.strength ?? 0.85);

  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const cell = buf.get(x, y);
      if (cell.ch === "") continue;
      const distance = Math.hypot(x - options.originX, (y - options.originY) * 1.65);
      const band = 1 - Math.abs(distance - head) / thickness;
      const alpha = clamp01(band) * strength * (1 - clamp01(progress) * 0.32);
      if (alpha <= 0.03) continue;
      const next: Style = {
        ...cell.style,
        tone: options.tone ?? cell.style.tone ?? "primary",
        fg: mixRgb(cell.style.fg ?? options.fgFrom, options.fgTo, alpha),
        bg: options.bg ? mixRgb(cell.style.bg ?? options.bg, options.bg, Math.min(1, alpha * 0.55)) : cell.style.bg,
        bold: cell.style.bold || alpha > 0.55,
      };
      buf.set(x, y, cell.ch, next);
    }
  }
}

export function drawVfxEffect(buf: CellBuffer, options: VfxEffectOptions): void {
  const rect = clampRect(options.rect, buf.width, buf.height);
  if (rect.w <= 0 || rect.h <= 0) return;
  const name = normalizeVfxEffectName(options.name);
  const progress = clamp01(options.progress);
  const strength = clamp01(options.strength ?? 0.78);
  if (progress <= 0 || progress >= 1.06 || strength <= 0) return;

  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const cell = buf.get(x, y);
      if (cell.ch === "") continue;
      const sample = sampleEffect(name, {
        x,
        y,
        rect,
        progress,
        originX: options.originX,
        originY: options.originY,
        seed: options.seed ?? 0,
      });
      const alpha = clamp01(sample.alpha * strength);
      if (alpha <= 0.025) continue;
      const baseFg = cell.style.fg ?? options.palette.text;
      const target = mixRgb(options.palette.primary, options.palette.secondary, sample.colorMix);
      const fg = mixRgb(baseFg, target, alpha);
      const baseBg = cell.style.bg ?? options.palette.surface;
      const bg = baseBg ? mixRgb(baseBg, options.palette.accent, clamp01(sample.bgAlpha * alpha)) : cell.style.bg;
      const style: Style = {
        ...cell.style,
        tone: options.tone ?? cell.style.tone ?? "primary",
        fg,
        bg,
        bold: cell.style.bold || sample.bold || alpha > 0.72,
      };
      buf.set(x, y, cell.ch, style);
    }
  }
}

export function normalizeVfxEffectName(name?: string): VfxEffectName {
  if (name && (vfxEffectNames as readonly string[]).includes(name)) {
    return name as VfxEffectName;
  }
  return "ripple";
}

export function vfxEffectNameAt(index: number): VfxEffectName {
  const total = vfxEffectNames.length;
  const next = ((Math.floor(index) % total) + total) % total;
  return vfxEffectNames[next] ?? "ripple";
}

type PaletteFamily =
  | "warm" | "cool" | "neon" | "sunset" | "aurora"
  | "cyber" | "ocean" | "lava" | "midnight" | "forest";

const effectPaletteFamily: Record<VfxEffectName, PaletteFamily> = {
  ripple: "cool",
  "vortex-spiral": "ocean",
  starburst: "warm",
  kaleidoscope: "neon",
  "comet-tail": "sunset",
  "lightning-branch": "cyber",
  "magnetic-field": "aurora",
  "scan-bloom": "cool",
  "glitch-shimmer": "cyber",
  "data-rain": "midnight",
  "circuit-ignite": "lava",
  "fire-ring": "lava",
  "gravity-well": "midnight",
  "hex-hive": "forest",
  "diamond-rain": "ocean",
  "nebula-pulse": "aurora",
  "pixel-storm": "cyber",
  "frost-crack": "cool",
  "chroma-spark": "neon",
  "spectrum-shear": "sunset",
  "page-curl": "warm",
  heartbeat: "lava",
  constellation: "midnight",
  "tide-pull": "ocean",
  "lensflare-slit": "warm",
};

const familyPalette: Record<PaletteFamily, VfxPalette> = {
  warm:       { primary: [255, 150, 60],  secondary: [255, 100, 40],  accent: [255, 200, 100], text: [240, 230, 210], surface: [16, 10, 6] },
  cool:       { primary: [0, 210, 200],   secondary: [60, 180, 220],  accent: [120, 230, 230], text: [220, 240, 242], surface: [4, 10, 14] },
  neon:       { primary: [255, 50, 180],  secondary: [100, 255, 100], accent: [255, 255, 60],  text: [255, 240, 255], surface: [20, 4, 36] },
  sunset:     { primary: [255, 120, 80],  secondary: [255, 60, 120],  accent: [255, 200, 120], text: [250, 235, 220], surface: [24, 10, 8] },
  aurora:     { primary: [80, 240, 180],  secondary: [140, 100, 240], accent: [100, 200, 240], text: [230, 245, 240], surface: [6, 12, 14] },
  cyber:      { primary: [0, 255, 100],   secondary: [255, 0, 200],   accent: [255, 255, 255], text: [230, 255, 230], surface: [4, 6, 4] },
  ocean:      { primary: [30, 180, 220],  secondary: [40, 140, 200],  accent: [140, 210, 220], text: [210, 235, 245], surface: [4, 10, 20] },
  lava:       { primary: [255, 80, 40],   secondary: [255, 160, 30],  accent: [255, 220, 80],  text: [255, 235, 220], surface: [18, 6, 4] },
  midnight:   { primary: [140, 100, 240], secondary: [80, 140, 220],  accent: [180, 180, 240], text: [230, 225, 245], surface: [10, 8, 22] },
  forest:     { primary: [80, 230, 80],   secondary: [140, 200, 60],  accent: [200, 180, 80],  text: [225, 240, 215], surface: [6, 12, 6] },
};

export function vfxPaletteFor(name: VfxEffectName): VfxPalette {
  return familyPalette[effectPaletteFamily[name]] ?? familyPalette.cool;
}

function sampleEffect(
  name: VfxEffectName,
  metrics: {
    x: number;
    y: number;
    rect: Rect;
    progress: number;
    originX: number;
    originY: number;
    seed: number;
  },
): VfxSample {
  const { x, y, rect, progress, originX, originY, seed } = metrics;
  const nx = rect.w <= 1 ? 0 : (x - rect.x) / (rect.w - 1);
  const ny = rect.h <= 1 ? 0 : (y - rect.y) / (rect.h - 1);
  const dx = x - originX;
  const dy = (y - originY) * 1.65;
  const distance = Math.hypot(dx, dy);
  const maxRadius = Math.max(1, Math.hypot(rect.w, rect.h * 1.65));
  const radial = distance / maxRadius;
  const angle = Math.atan2(dy, dx);
  const wipe = ease("easeOutCubic", progress);
  const hash = hash01(x, y, seed);
  const wave = (Math.sin((nx * 10 + ny * 6 + progress * 8 + seed) * Math.PI) + 1) / 2;
  let alpha = 0;
  let colorMix = 0.5;
  let bgAlpha = 0.22;
  let bold = false;

  switch (name) {
    case "ripple": {
      alpha = ring(radial, wipe, 0.1) * fade(progress, 0.18);
      colorMix = radial;
      break;
    }
    case "vortex-spiral": {
      const arms = 3;
      const spin = angle + progress * Math.PI * 3 + seed;
      const spiral = (radial * 0.7 + fract(spin / (Math.PI * 2 / arms)) * 0.3);
      alpha = clamp01(1 - Math.abs(fract(spin / (Math.PI * 2 / arms)) - 0.5) * 8) * clamp01(1 - Math.abs(radial - wipe * 0.9) * 5) * fade(progress, 0.14);
      colorMix = spiral;
      bold = alpha > 0.55;
      break;
    }
    case "starburst": {
      const spokes = Math.abs(Math.sin(angle * 8 + progress * 7));
      alpha = ring(radial, wipe, 0.16) * Math.max(0.2, 1 - spokes) * fade(progress, 0.2);
      colorMix = spokes;
      break;
    }
    case "kaleidoscope": {
      const segments = 3;
      const segAngle = (Math.PI * 2) / segments;
      const mirrored = Math.abs(Math.sin(angle * segments / 2) * 2 - 1);
      alpha = clamp01(1 - mirrored * 4) * clamp01(1 - Math.abs(radial - wipe * 0.75) * 5) * fade(progress, 0.16);
      colorMix = mirrored;
      bold = alpha > 0.6;
      break;
    }
    case "comet-tail": {
      const head = wipe * 1.25 - 0.12;
      const lane = Math.abs(ny - (0.5 + Math.sin(progress * Math.PI * 2 + seed) * 0.22));
      alpha = clamp01(1 - Math.abs(nx - head) * 9) * clamp01(1 - lane * 5) + clamp01(head - nx) * clamp01(1 - (head - nx) * 2.4) * clamp01(1 - lane * 3.5) * 0.6;
      colorMix = 0.15 + hash * 0.85;
      bold = alpha > 0.54;
      break;
    }
    case "lightning-branch": {
      const boltY = 0.25 + Math.sin(nx * Math.PI + progress * 7 + seed * 3) * 0.35;
      const mainBolt = clamp01(1 - Math.abs(ny - boltY) * 11) * (nx < wipe ? 1 : 0.15);
      const branch = hash01(x + Math.floor(progress * 5), Math.floor(y / 3), seed);
      const branchAlpha = branch > 0.76 ? clamp01(1 - Math.abs(nx - wipe * 0.7) * 6) * 0.55 : 0;
      alpha = Math.max(mainBolt, branchAlpha) * fade(progress, 0.08);
      colorMix = hash;
      bold = alpha > 0.5;
      break;
    }
    case "magnetic-field": {
      const poleA = Math.hypot((nx - 0.28) * 1.2, (ny - 0.5) * 2.4);
      const poleB = Math.hypot((nx - 0.72) * 1.2, (ny - 0.5) * 2.4);
      const field = Math.abs(Math.sin((poleA + poleB - progress * 1.8) * Math.PI * 5));
      alpha = clamp01(1 - field * 3.2) * fade(progress, 0.14);
      colorMix = clamp01(poleA / Math.max(0.001, poleA + poleB));
      break;
    }
    case "scan-bloom": {
      alpha = clamp01(1 - Math.abs(nx - wipe) * 18) * (0.4 + clamp01(1 - Math.abs(ny - 0.5) * 1.7) * 0.6);
      colorMix = ny;
      bgAlpha = 0.42;
      bold = alpha > 0.5;
      break;
    }
    case "glitch-shimmer": {
      const rowJitter = hash01(Math.floor(progress * 16), y, seed);
      alpha = rowJitter > 0.57 ? clamp01(1 - Math.abs(nx - rowJitter) * 5) * fade(progress, 0.08) : 0;
      colorMix = hash;
      break;
    }
    case "data-rain": {
      const drop = (ny + progress * 1.7 + hash01(x, seed, 3) * 0.5) % 1;
      alpha = clamp01(1 - Math.abs(drop - 0.82) * 12) * (hash > 0.32 ? 1 : 0.35) * fade(progress, 0.06);
      colorMix = drop;
      break;
    }
    case "circuit-ignite": {
      const manhattan = (Math.abs(dx) + Math.abs(y - originY) * 2.2) / Math.max(1, rect.w + rect.h);
      const trace = (x === originX || y === originY || (x + y + seed) % 7 === 0) ? 1 : 0.25;
      alpha = ring(manhattan, wipe * 0.72, 0.045) * trace * fade(progress, 0.16);
      colorMix = hash;
      bold = trace > 0.5;
      break;
    }
    case "fire-ring": {
      const rings = 3;
      let ringSum = 0;
      for (let r = 0; r < rings; r++) {
        const phase = (wipe + r / rings) % 1;
        ringSum += ring(radial, phase, 0.06) * (1 - r * 0.25);
      }
      alpha = ringSum * fade(progress, 0.18);
      colorMix = 0.1 + radial * 0.9;
      bold = alpha > 0.5;
      break;
    }
    case "gravity-well": {
      const pull = clamp01(1 - radial * 2.8);
      const shell = ring(radial, 0.18 + wipe * 0.48, 0.08);
      alpha = (pull * (1 - progress * 0.3) + shell * 0.75) * fade(progress, 0.22);
      colorMix = 1 - radial;
      bgAlpha = 0.36;
      break;
    }
    case "hex-hive": {
      const hexRow = Math.floor(ny * 12);
      const hexCol = Math.floor(nx * 10 + (hexRow % 2) * 0.5);
      const cx = (hexCol + (hexRow % 2) * 0.5) / 10;
      const cy = hexRow / 12 + 1 / 24;
      const hexDist = Math.hypot((nx - cx) * 1.73, (ny - cy) * 2);
      const hexPulse = Math.sin((hexCol * 0.7 + hexRow * 0.9 - progress * 2.5) * Math.PI) * 0.5 + 0.5;
      alpha = clamp01(1 - hexDist * 11) * (0.3 + hexPulse * 0.7) * fade(progress, 0.16);
      colorMix = hexPulse;
      bold = hexPulse > 0.7;
      break;
    }
    case "diamond-rain": {
      const diag = (nx + ny) % 1;
      const drop = (ny + nx * 0.35 + progress * 1.6 + hash01(x, seed, 7) * 0.5) % 1;
      const diamond = clamp01(1 - Math.abs(drop - 0.75) * 10) * clamp01(1 - Math.abs(diag - 0.5) * 7);
      alpha = diamond * (hash > 0.28 ? 1 : 0.3) * fade(progress, 0.08);
      colorMix = drop;
      bold = hash > 0.8;
      break;
    }
    case "nebula-pulse": {
      const blob = (Math.sin(nx * 9 + progress * 4 + seed) + Math.cos(ny * 7 - progress * 5)) / 2;
      alpha = clamp01((blob + 1) / 2 - radial * 0.35) * fade(progress, 0.2);
      colorMix = clamp01((blob + 1) / 2);
      bgAlpha = 0.3;
      break;
    }
    case "pixel-storm": {
      const blockX = Math.floor(nx * 16);
      const blockY = Math.floor(ny * 12);
      const blockFall = (ny * 1.2 + blockX * 0.15 + progress * 2 + hash01(blockX, blockY, seed) * 0.6) % 1;
      const blockSize = hash01(blockX, blockY, seed + 1) > 0.5 ? 2 : 1;
      const block = clamp01(1 - blockFall * 4.5) * (blockSize > 1 ? 1 : 0.55);
      alpha = block * (hash > 0.34 ? 1 : 0.2) * fade(progress, 0.12);
      colorMix = hash;
      bold = blockSize > 1 && alpha > 0.5;
      break;
    }
    case "frost-crack": {
      const crack = Math.abs(Math.sin((nx * 15 + ny * 11 + hash * 2 - progress * 4) * Math.PI));
      alpha = clamp01(1 - crack * 7) * clamp01(wipe * 1.25 - radial * 0.4) * fade(progress, 0.12);
      colorMix = 0.86;
      break;
    }
    case "chroma-spark": {
      const spark = hash01(x + Math.floor(progress * 17), y, seed);
      alpha = spark > 0.84 ? clamp01(1 - radial * 0.9) * fade(progress, 0.05) : ring(radial, wipe, 0.045) * 0.45;
      colorMix = spark;
      bold = spark > 0.92;
      break;
    }
    case "spectrum-shear": {
      const shear = Math.abs(nx + ny * 0.55 - wipe * 1.35);
      alpha = clamp01(1 - shear * 7) * (0.42 + wave * 0.58);
      colorMix = fract(nx * 1.4 + ny * 0.8 + progress);
      break;
    }
    case "page-curl": {
      const curl = nx + Math.sin(ny * Math.PI * 1.8 + seed) * 0.12 * (1 - nx);
      const shadow = 1 - nx;
      alpha = (clamp01(1 - Math.abs(curl - wipe) * 9) * 0.7 + clamp01(1 - shadow * 3) * clamp01(wipe - nx) * 0.35) * fade(progress, 0.06);
      colorMix = clamp01(nx * 0.5 + ny * 0.3);
      bgAlpha = 0.45;
      bold = alpha > 0.55;
      break;
    }
    case "heartbeat": {
      const beatPhase = progress * Math.PI * 2;
      const lub = clamp01(Math.sin(beatPhase * 0.7) * 2.5) * (beatPhase < Math.PI * 0.35 ? 1 : 0.22);
      const dub = clamp01(Math.sin((beatPhase - Math.PI * 0.4) * 0.7) * 2.5) * (beatPhase > Math.PI * 0.3 && beatPhase < Math.PI * 0.65 ? 0.8 : 0.15);
      const pulse = 0.18 + Math.max(lub, dub) * 0.22;
      alpha = clamp01(1 - Math.abs(radial - pulse) * 3.5) * (0.35 + wave * 0.65) * 0.9;
      colorMix = 1 - radial;
      bold = alpha > 0.45;
      break;
    }
    case "constellation": {
      const starCount = 6;
      let nearestDist = 999;
      let nearestStar = 0;
      for (let s = 0; s < starCount; s++) {
        const sx = 0.12 + hash01(s, seed, 1) * 0.76;
        const sy = 0.12 + hash01(s, seed + 2, 3) * 0.76;
        const dist = Math.hypot((nx - sx) * 1.6, (ny - sy) * 1.6);
        if (dist < nearestDist) { nearestDist = dist; nearestStar = s; }
      }
      const starGlow = clamp01(1 - nearestDist * 7);
      const connectLine = clamp01(1 - nearestDist * 16) * 0.35;
      alpha = (starGlow * 0.7 + connectLine) * (0.3 + ring(radial, wipe * 0.6, 0.12) * 0.7) * fade(progress, 0.16);
      colorMix = nearestStar / starCount;
      bold = starGlow > 0.7;
      break;
    }
    case "tide-pull": {
      const tide = Math.abs(ny - (0.5 + Math.sin((nx - progress) * Math.PI * 3 + seed) * 0.25));
      alpha = clamp01(1 - tide * 5) * clamp01(1 - Math.abs(nx - wipe) * 1.8) * fade(progress, 0.18);
      colorMix = ny;
      break;
    }
    case "lensflare-slit": {
      const h = clamp01(1 - Math.abs(y - originY) / Math.max(1, rect.h * 0.16));
      const v = clamp01(1 - Math.abs(x - originX) / Math.max(1, rect.w * 0.13));
      const travel = ring(nx, wipe, 0.1);
      alpha = Math.max(h * 0.65, v * 0.45, travel) * fade(progress, 0.1);
      colorMix = clamp01(nx * 0.7 + h * 0.3);
      bgAlpha = 0.34;
      bold = alpha > 0.58;
      break;
    }
  }

  return {
    alpha: clamp01(alpha),
    colorMix: clamp01(colorMix),
    bgAlpha: clamp01(bgAlpha),
    bold,
  };
}

function ring(value: number, head: number, thickness: number): number {
  return clamp01(1 - Math.abs(value - head) / Math.max(0.001, thickness));
}

function fade(progress: number, tail = 0.12): number {
  return clamp01(1 - Math.max(0, progress - tail) / Math.max(0.001, 1 - tail) * 0.3);
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash01(a: number, b: number, c: number): number {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123;
  return fract(value);
}

function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(width, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(height, Math.floor(rect.y)));
  const x1 = Math.max(x, Math.min(width, Math.floor(rect.x + rect.w)));
  const y1 = Math.max(y, Math.min(height, Math.floor(rect.y + rect.h)));
  return { x, y, w: x1 - x, h: y1 - y };
}
