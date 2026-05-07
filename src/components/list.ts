import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth, truncateText } from "../text/measure.js";

export interface ListState {
  items: string[];
  selected: number;
  scroll: number;
  focused: boolean;
}

export function drawList(
  buf: CellBuffer,
  rect: Rect,
  state: ListState,
  style: Style = {},
): void {
  const visibleH = rect.h;
  let y = rect.y;

  for (let i = state.scroll; i < state.items.length && y < rect.y + visibleH; i++) {
    const item = state.items[i];
    const isSelected = i === state.selected;
    const tone = isSelected && state.focused ? "primary" : "normal";

    // Selection highlight background
    if (isSelected) {
      for (let dx = 0; dx < rect.w; dx++) {
        buf.set(rect.x + dx, y, " ", {
          tone: state.focused ? "primary" : "muted",
          bg: state.focused ? undefined : undefined,
          inverse: state.focused,
        });
      }
    }

    const trimmed = truncateText(item, rect.w - 2);
    buf.write(rect.x + 1, y, trimmed, { tone, bold: isSelected, inverse: isSelected && state.focused, ...style }, rect.w - 2);

    y++;
  }
}

export function listScrollFor(state: ListState, newSelected: number): number {
  let scroll = state.scroll;
  if (newSelected < scroll) scroll = newSelected;
  // viewHeight isn't stored in the state, so caller needs to provide it
  return scroll;
}

export function clampListSelection(state: ListState): number {
  return Math.max(0, Math.min(state.selected, Math.max(0, state.items.length - 1)));
}
