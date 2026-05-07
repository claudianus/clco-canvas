import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";

export interface ProgressBarState {
  value: number; // 0–1
  label?: string;
}

export function drawProgressBar(
  buf: CellBuffer,
  rect: Rect,
  state: ProgressBarState,
  style: Style = {},
): void {
  const innerW = Math.max(1, rect.w);
  const clamped = Math.max(0, Math.min(1, state.value));
  const filled = Math.round(clamped * innerW);

  for (let i = 0; i < innerW; i++) {
    const ch = i < filled ? "█" : "░";
    const tone = i < filled ? "primary" : "muted";
    buf.set(rect.x + i, rect.y, ch, { tone, ...style });
  }

  if (state.label) {
    const pct = `${Math.round(clamped * 100)}%`;
    const combined = state.label ? `${state.label} ${pct}` : pct;
    const x = rect.x + Math.max(0, Math.floor((innerW - combined.length) / 2));
    buf.write(x, rect.y, combined, { tone: "normal", bold: true }, innerW);
  }
}
