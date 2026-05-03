import type { Rect } from "../types.js";

export function clampRect(rect: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(width, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(height, Math.floor(rect.y)));
  return {
    x,
    y,
    w: Math.max(0, Math.min(width - x, Math.floor(rect.w))),
    h: Math.max(0, Math.min(height - y, Math.floor(rect.h))),
  };
}

export function splitRows(rect: Rect, tracks: number[]): Rect[] {
  let y = rect.y;
  return tracks.map((h, index) => {
    const rowHeight = index === tracks.length - 1 ? Math.max(0, rect.y + rect.h - y) : Math.max(0, h);
    const out = { x: rect.x, y, w: rect.w, h: rowHeight };
    y += rowHeight;
    return out;
  });
}

export function splitCols(rect: Rect, tracks: number[]): Rect[] {
  let x = rect.x;
  return tracks.map((w, index) => {
    const colWidth = index === tracks.length - 1 ? Math.max(0, rect.x + rect.w - x) : Math.max(0, w);
    const out = { x, y: rect.y, w: colWidth, h: rect.h };
    x += colWidth;
    return out;
  });
}

export function inset(rect: Rect, pad: number): Rect {
  return {
    x: rect.x + pad,
    y: rect.y + pad,
    w: Math.max(0, rect.w - pad * 2),
    h: Math.max(0, rect.h - pad * 2),
  };
}
