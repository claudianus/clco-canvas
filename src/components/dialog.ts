import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth } from "../text/measure.js";
import { drawBox } from "../paint/primitives.js";
import { wrapText } from "../text/wrap.js";

export interface DialogState {
  title: string;
  message: string;
  buttons?: string[];
  focusedButton?: number;
}

export function drawDialog(
  buf: CellBuffer,
  rect: Rect,
  state: DialogState,
  style: Style = {},
): void {
  drawBox(buf, rect, state.title, { tone: "primary", ...style }, true);

  const inner = { x: rect.x + 2, y: rect.y + 2, w: rect.w - 4, h: rect.h - 4 };

  // Message — word wrapped
  if (state.message) {
    const lines = wrapText(state.message, { width: inner.w });
    for (let i = 0; i < Math.min(lines.length, inner.h - 1); i++) {
      buf.write(inner.x, inner.y + i, lines[i], { tone: "normal" }, inner.w);
    }
  }

  // Buttons
  if (state.buttons && state.buttons.length > 0) {
    const btnY = rect.y + rect.h - 2;
    const totalBtnW = state.buttons.reduce((s, b) => s + displayWidth(b) + 4, 0);
    let x = rect.x + Math.max(0, Math.floor((rect.w - totalBtnW) / 2));

    for (let i = 0; i < state.buttons.length; i++) {
      const label = state.buttons[i];
      const focused = i === (state.focusedButton ?? 0);
      const btnW = displayWidth(label) + 4;
      const tone = focused ? "primary" : "muted";

      buf.write(x, btnY, `[ ${label} ]`, { tone, bold: focused }, btnW);
      x += btnW;
    }
  }
}
