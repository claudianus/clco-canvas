import type { Rect, Style, Tone } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { drawMeter } from "../paint/primitives.js";

export interface TokenBudget {
  used: number;
  limit: number;
}

export interface TokenMeterState {
  /** Context window usage */
  context: TokenBudget;
  /** Generation (output) usage */
  generation?: TokenBudget;
  /** Label for the meter */
  label?: string;
}

export function drawTokenMeter(
  buf: CellBuffer,
  rect: Rect,
  state: TokenMeterState,
  style: Style = {},
): void {
  const { context, generation, label } = state;
  const ctxRatio = context.limit > 0 ? context.used / context.limit : 0;
  const ctxTone: Tone = ctxRatio > 0.9 ? "danger" : ctxRatio > 0.7 ? "warning" : "primary";

  let y = rect.y;

  if (label) {
    buf.write(rect.x, y, label, { tone: "muted", ...style }, rect.w);
    y++;
  }

  // Context bar
  const ctxLabel = `Context ${context.used.toLocaleString()}/${context.limit.toLocaleString()}`;
  drawMeter(buf, rect.x, y, Math.min(rect.w, 40), ctxRatio, ctxTone);
  buf.write(rect.x + 2, y, ctxLabel, { tone: "muted", bold: true }, 38);
  y++;

  // Generation bar
  if (generation && generation.limit > 0) {
    const genRatio = generation.used / generation.limit;
    const genTone: Tone = genRatio > 0.9 ? "danger" : genRatio > 0.7 ? "warning" : "info";
    const genLabel = `Output  ${generation.used.toLocaleString()}/${generation.limit.toLocaleString()}`;
    drawMeter(buf, rect.x, y, Math.min(rect.w, 40), genRatio, genTone);
    buf.write(rect.x + 2, y, genLabel, { tone: "muted", bold: true }, 38);
    y++;
  }

  // Total percentage
  const totalPct = Math.round(ctxRatio * 100);
  const pctStr = `${totalPct}% used`;
  if (y < rect.y + rect.h) {
    buf.write(rect.x, y, pctStr, { tone: ctxTone, dim: true, ...style }, rect.w);
  }
}

export function tokenWarning(contextUsed: number, contextLimit: number): "none" | "warn" | "critical" {
  const ratio = contextLimit > 0 ? contextUsed / contextLimit : 0;
  if (ratio > 0.95) return "critical";
  if (ratio > 0.75) return "warn";
  return "none";
}
