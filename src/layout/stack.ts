import type { Rect } from "../types.js";
import type { Constraint } from "./constraint.js";
import { resolveConstraints } from "./constraint.js";
import { splitRows, splitCols } from "./grid.js";

export function vStack(
  rect: Rect,
  constraints: Constraint[],
  gap = 0,
): Rect[] {
  if (constraints.length === 0) return [];
  const sizes = resolveConstraints(rect.h, constraints, gap);
  const rects = splitRows(rect, sizes);
  if (gap > 0) {
    let y = rect.y;
    for (let i = 0; i < rects.length; i++) {
      rects[i].y = y;
      y += rects[i].h + gap;
    }
  }
  return rects;
}

export function hStack(
  rect: Rect,
  constraints: Constraint[],
  gap = 0,
): Rect[] {
  if (constraints.length === 0) return [];
  const sizes = resolveConstraints(rect.w, constraints, gap);
  const rects = splitCols(rect, sizes);
  if (gap > 0) {
    let x = rect.x;
    for (let i = 0; i < rects.length; i++) {
      rects[i].x = x;
      x += rects[i].w + gap;
    }
  }
  return rects;
}
