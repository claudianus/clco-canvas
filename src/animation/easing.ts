export type EasingName =
  | "linear"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeOutCubic"
  | "easeInOutCubic";

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

