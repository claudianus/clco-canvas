import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth, segmentGraphemes } from "../text/measure.js";
import { drawBox } from "../paint/primitives.js";

export interface TextInputState {
  value: string;
  cursor: number;
  focused: boolean;
  placeholder?: string;
}

export function drawTextInput(
  buf: CellBuffer,
  rect: Rect,
  state: TextInputState,
  style: Style = {},
): void {
  const tone = state.focused ? "primary" : "muted";
  drawBox(buf, rect, undefined, { ...style, tone }, false);

  const innerW = Math.max(1, rect.w - 2);
  const display = state.value || state.placeholder || "";
  const cursorClamped = Math.max(0, Math.min(state.cursor, display.length));

  // Calculate scroll offset so cursor stays visible
  let scroll = 0;
  const segs = segmentGraphemes(display);
  let cursorDw = 0;
  for (let i = 0; i < cursorClamped && i < segs.length; i++) {
    cursorDw += displayWidth(segs[i]);
  }
  if (cursorDw >= innerW) {
    // Scroll to keep cursor in view
    let dw = 0;
    for (let i = 0; i < segs.length; i++) {
      const sw = displayWidth(segs[i]);
      if (dw + sw > cursorDw - innerW + 2) break;
      dw += sw;
      scroll = i + 1;
    }
  }

  const visible = segs.slice(scroll);
  let written = 0;
  let col = rect.x + 1;
  for (const seg of visible) {
    const dw = displayWidth(seg);
    if (written + dw > innerW) break;
    buf.write(col, rect.y + Math.floor(rect.h / 2), seg, { tone: "normal" }, dw);
    col += dw;
    written += dw;
  }

  // Draw cursor
  if (state.focused) {
    const cursorX = rect.x + 1 + cursorDw - displayWidth(segs.slice(0, scroll).join(""));
    buf.set(cursorX, rect.y + Math.floor(rect.h / 2), "▌", { tone: "primary", inverse: true });
  }
}
