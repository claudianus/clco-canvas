import type { Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { wrapText } from "../text/wrap.js";

export interface StreamingTextState {
  /** Full text to eventually display */
  text: string;
  /** Characters revealed so far */
  revealed: number;
  /** Show blinking cursor at the end */
  cursor: boolean;
  /** Cursor blink phase (toggled by caller each frame) */
  cursorVisible: boolean;
  /** Animation speed multiplier (1 = normal) */
  speed: number;
}

export function drawStreamingText(
  buf: CellBuffer,
  x: number,
  y: number,
  width: number,
  state: StreamingTextState,
  style: Style = {},
): number {
  const visible = state.text.slice(0, state.revealed);
  const lines = wrapText(visible, { width });

  let row = y;
  for (let i = 0; i < lines.length && row < buf.height; i++) {
    buf.write(x, row, lines[i], style, width);
    row++;
  }

  if (state.cursor && state.cursorVisible && row > y) {
    const lastLine = lines.length > 0 ? lines[lines.length - 1] : "";
    const lastLen = lastLine.length;
    const cx = x + (lastLen % width);
    const cy = y + lines.length - 1;
    if (cy >= y && cy < buf.height) {
      buf.set(cx, cy, "▍", { ...style, bold: true });
    }
  }

  return row - y;
}

export function streamingProgress(revealed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, revealed / total);
}
