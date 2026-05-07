import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth } from "../text/measure.js";

export interface TabDef {
  id: string;
  label: string;
}

export interface TabsState {
  tabs: TabDef[];
  active: number;
}

export function drawTabs(
  buf: CellBuffer,
  rect: Rect,
  state: TabsState,
  style: Style = {},
): void {
  if (state.tabs.length === 0) return;

  const tabWidths = state.tabs.map((t) => displayWidth(t.label) + 4); // "│ label │"
  const totalTabW = tabWidths.reduce((s, w) => s + w, 0);
  const gap = state.tabs.length > 1 ? Math.floor((rect.w - totalTabW) / (state.tabs.length - 1)) : 0;

  let x = rect.x;
  for (let i = 0; i < state.tabs.length; i++) {
    const tab = state.tabs[i];
    const active = i === state.active;
    const tone = active ? "primary" : "muted";

    // Draw tab background
    for (let dx = 0; dx < tabWidths[i]; dx++) {
      buf.set(x + dx, rect.y, active ? "▔" : "─", { tone });
    }

    // Label
    const labelX = x + Math.floor((tabWidths[i] - displayWidth(tab.label)) / 2);
    buf.write(labelX, rect.y + 1, tab.label, { tone, bold: active, ...style }, tabWidths[i]);

    // Bottom border — primary bar for active
    for (let dx = 0; dx < tabWidths[i]; dx++) {
      buf.set(x + dx, rect.y + rect.h - 1, active ? "▀" : "─", { tone });
    }

    x += tabWidths[i] + gap;
  }
}
