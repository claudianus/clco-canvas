import type { FlexTrack } from "./flex.js";
import { solveFlex } from "./flex.js";

export type Constraint =
  | { type: "fixed"; value: number }
  | { type: "flex"; grow?: number; shrink?: number }
  | { type: "ratio"; value: number }
  | { type: "content"; min?: number; max?: number };

export function toFlexTrack(c: Constraint): FlexTrack {
  switch (c.type) {
    case "fixed":
      return { basis: Math.floor(c.value), grow: 0, shrink: 0, min: Math.floor(c.value), max: Math.floor(c.value) };
    case "flex":
      return { grow: c.grow ?? 1, shrink: c.shrink, min: 0 };
    case "ratio":
      return { grow: c.value, min: 0 };
    case "content":
      return { min: c.min ?? 0, max: c.max, grow: 1 };
  }
}

export function resolveConstraints(total: number, constraints: Constraint[], gap = 0): number[] {
  if (constraints.length === 0) return [];

  // Separate fixed from flexible constraints
  const hasFlex = constraints.some((c) => c.type === "flex" || c.type === "ratio" || c.type === "content");
  const fixedTotal = constraints
    .filter((c) => c.type === "fixed")
    .reduce((sum, c) => sum + ("value" in c ? Math.floor(c.value) : 0), 0);

  if (!hasFlex) {
    // All fixed: just return the values
    return constraints.map((c) => ("value" in c ? Math.floor(c.value) : 0));
  }

  return solveFlex(total, constraints.map(toFlexTrack), gap);
}

export function fixed(value: number): Constraint {
  return { type: "fixed", value };
}

export function flex(grow = 1): Constraint {
  return { type: "flex", grow };
}

export function ratio(value: number): Constraint {
  return { type: "ratio", value };
}

export function content(min = 0, max?: number): Constraint {
  return { type: "content", min, max };
}
