import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";

export interface ViewportState {
  offset: number;
  contentHeight: number;
  viewHeight: number;
}

export function createViewport(contentHeight: number, viewHeight: number): ViewportState {
  return {
    offset: 0,
    contentHeight: Math.max(0, contentHeight),
    viewHeight: Math.max(1, viewHeight),
  };
}

export function scrollViewport(state: ViewportState, delta: number): ViewportState {
  return clampViewport({
    ...state,
    offset: state.offset + delta,
  });
}

export function scrollToViewport(state: ViewportState, offset: number): ViewportState {
  return clampViewport({ ...state, offset });
}

export function scrollToEnd(state: ViewportState): ViewportState {
  const maxOffset = Math.max(0, state.contentHeight - state.viewHeight);
  return { ...state, offset: maxOffset };
}

export function scrollToStart(state: ViewportState): ViewportState {
  return { ...state, offset: 0 };
}

export function clampViewport(state: ViewportState): ViewportState {
  const maxOffset = Math.max(0, state.contentHeight - state.viewHeight);
  return {
    ...state,
    offset: Math.max(0, Math.min(state.offset, maxOffset)),
  };
}

export function visibleRange(state: ViewportState): { start: number; end: number } {
  const clamped = clampViewport(state);
  return {
    start: clamped.offset,
    end: Math.min(clamped.offset + clamped.viewHeight, clamped.contentHeight),
  };
}

export function viewportRatio(state: ViewportState): { position: number; size: number } {
  if (state.contentHeight <= state.viewHeight) return { position: 0, size: 1 };
  const size = Math.max(0.05, state.viewHeight / state.contentHeight);
  const maxOffset = state.contentHeight - state.viewHeight;
  const position = maxOffset > 0 ? (state.offset / maxOffset) * (1 - size) : 0;
  return { position, size };
}

export function drawScrollbar(
  buffer: CellBuffer,
  rect: Rect,
  state: ViewportState,
  style: Style = {},
  vertical = true,
): void {
  if (state.contentHeight <= state.viewHeight) return;

  if (vertical) {
    drawVerticalScrollbar(buffer, rect, state, style);
  } else {
    drawHorizontalScrollbar(buffer, rect, state, style);
  }
}

function drawVerticalScrollbar(
  buffer: CellBuffer,
  rect: Rect,
  state: ViewportState,
  style: Style,
): void {
  const trackH = rect.h - 2; // exclude top/bottom borders
  if (trackH <= 0) return;
  const r = viewportRatio(state);
  const thumbStart = Math.round(r.position * trackH);
  const thumbSize = Math.max(1, Math.round(r.size * trackH));

  const x = rect.x + rect.w - 1;
  // Track background
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    buffer.set(x, y, "│", { tone: "muted" });
  }
  // Thumb
  for (let i = 0; i < thumbSize; i++) {
    const y = rect.y + 1 + thumbStart + i;
    if (y < rect.y + rect.h - 1) {
      buffer.set(x, y, "█", style);
    }
  }
}

function drawHorizontalScrollbar(
  buffer: CellBuffer,
  rect: Rect,
  state: ViewportState,
  style: Style,
): void {
  const trackW = rect.w - 2;
  if (trackW <= 0) return;
  const r = viewportRatio(state);
  const thumbStart = Math.round(r.position * trackW);
  const thumbSize = Math.max(1, Math.round(r.size * trackW));

  const y = rect.y + rect.h - 1;
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    buffer.set(x, y, "─", { tone: "muted" });
  }
  for (let i = 0; i < thumbSize; i++) {
    const x = rect.x + 1 + thumbStart + i;
    if (x < rect.x + rect.w - 1) {
      buffer.set(x, y, "█", style);
    }
  }
}
