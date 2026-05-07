export type EasingName =
  | "linear"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeOutBounce"
  | "easeOutElastic"
  | "easeOutBack"
  | "easeInOutExpo"
  | "easeOutExpo";

export type EasingFunction = (t: number) => number;

export const easings: Record<EasingName, EasingFunction> = {
  linear: (t) => clamp01(t),
  easeInQuad: (t) => {
    const x = clamp01(t);
    return x * x;
  },
  easeOutQuad: (t) => {
    const x = clamp01(t);
    return 1 - (1 - x) * (1 - x);
  },
  easeInOutQuad: (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2;
  },
  easeOutCubic: (t) => 1 - (1 - clamp01(t)) ** 3,
  easeInOutCubic: (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
  },
  easeOutBounce: (t) => {
    const x = clamp01(t);
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) { const x2 = x - 1.5 / d1; return n1 * x2 * x2 + 0.75; }
    if (x < 2.5 / d1) { const x3 = x - 2.25 / d1; return n1 * x3 * x3 + 0.9375; }
    const x4 = x - 2.625 / d1;
    return n1 * x4 * x4 + 0.984375;
  },
  easeOutElastic: (t) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeOutBack: (t) => {
    const x = clamp01(t);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
  easeInOutExpo: (t) => {
    const x = clamp01(t);
    return x === 0 ? 0 : x === 1 ? 1 : x < 0.5
      ? 2 ** (20 * x - 10) / 2
      : (2 - 2 ** (-20 * x + 10)) / 2;
  },
  easeOutExpo: (t) => {
    const x = clamp01(t);
    return x === 1 ? 1 : 1 - 2 ** (-10 * x);
  },
};

export function ease(name: EasingName | EasingFunction, t: number): number {
  return typeof name === "function" ? clamp01(name(clamp01(t))) : easings[name](t);
}

export function tween(from: number, to: number, progress: number, easing: EasingName | EasingFunction = "linear"): number {
  const x = ease(easing, progress);
  return from + (to - from) * x;
}

export function stagger(index: number, total: number, progress: number, spread = 0.35): number {
  const count = Math.max(1, total);
  const offset = count === 1 ? 0 : (index / (count - 1)) * spread;
  return clamp01((progress - offset) / Math.max(0.0001, 1 - spread));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

