import type { Rgb } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { mixRgb } from "../style/theme.js";
import { segmentGraphemes, displayWidth } from "../text/measure.js";

export function drawGradientRule(
  buf: CellBuffer,
  x: number,
  y: number,
  width: number,
  from: Rgb,
  to: Rgb,
  trueColor: boolean,
): void {
  if (width <= 0) return;
  if (!trueColor) {
    for (let i = 0; i < width; i++) {
      const ratio = width <= 1 ? 0 : i / (width - 1);
      const tone = ratio < 0.45 ? "muted" : ratio < 0.72 ? "info" : "primary";
      buf.set(x + i, y, "─", { tone });
    }
    return;
  }
  for (let i = 0; i < width; i++) {
    const ratio = width <= 1 ? 0 : i / (width - 1);
    buf.set(x + i, y, "─", { tone: "primary", fg: mixRgb(from, to, ratio) });
  }
}

export function drawGradientText(
  buf: CellBuffer,
  x: number,
  y: number,
  text: string,
  width: number,
  from: Rgb,
  to: Rgb,
  trueColor: boolean,
): void {
  if (width <= 0 || text.length === 0) return;

  const segments = segmentGraphemes(text);
  const totalUnits = segments.reduce((sum, seg) => sum + Math.max(1, seg.length), 0);

  if (!trueColor) {
    buf.write(x, y, text, { tone: "primary", bold: true }, width);
    return;
  }

  let col = x;
  let used = 0;
  for (const seg of segments) {
    const dw = displayWidth(seg);
    if (dw <= 0 || used + dw > width) break;
    const ratio = totalUnits <= 1 ? 0 : used / Math.max(1, totalUnits - 1);
    buf.write(col, y, seg, { tone: "primary", fg: mixRgb(from, to, ratio), bold: true }, dw);
    col += dw;
    used += dw;
  }
}
