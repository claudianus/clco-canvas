import type { Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface SpinnerState {
  frame: number;
  message?: string;
}

export function drawSpinner(
  buf: CellBuffer,
  x: number,
  y: number,
  state: SpinnerState,
  style: Style = {},
): void {
  const glyph = FRAMES[Math.abs(state.frame) % FRAMES.length];
  buf.set(x, y, glyph, { tone: "primary", bold: true, ...style });
  if (state.message) {
    buf.write(x + 2, y, state.message, { tone: "muted" }, 80);
  }
}

export function spinnerFrame(now: number, baseMs = 80): number {
  return Math.floor(now / baseMs);
}
