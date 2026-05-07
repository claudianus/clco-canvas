import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth } from "../text/measure.js";
import { drawBox } from "../paint/primitives.js";

export interface ButtonState {
  label: string;
  focused: boolean;
  pressed: boolean;
}

export function drawButton(
  buf: CellBuffer,
  rect: Rect,
  state: ButtonState,
  style: Style = {},
): void {
  const tone = state.focused ? "primary" : "muted";
  const finalStyle: Style = state.pressed ? { ...style, tone: "primary", bold: true, inverse: true } : { ...style, tone };

  drawBox(buf, rect, undefined, finalStyle, false);

  const labelDw = displayWidth(state.label);
  const x = rect.x + Math.max(0, Math.floor((rect.w - labelDw) / 2));
  const y = rect.y + Math.max(0, Math.floor((rect.h - 1) / 2));

  buf.write(x, y, state.label, finalStyle, rect.w);
  if (state.focused && !state.pressed) {
    buf.set(rect.x, rect.y, "▐", { tone: "primary" });
  }
}
