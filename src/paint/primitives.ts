import type { Rect, Style, Tone } from "../types.js";
import { CellBuffer } from "../buffer/cell-buffer.js";
import { displayWidth, fitDisplay, truncateText } from "../text/measure.js";

const BOX = {
  tl: "┌",
  tr: "┐",
  bl: "└",
  br: "┘",
  h: "─",
  v: "│",
  lt: "├",
  rt: "┤",
} as const;

export interface MenuItem {
  value: string;
  label: string;
  hint?: string;
  section?: string;
  glyph?: string;
  tone?: Tone;
}

export function drawText(buf: CellBuffer, x: number, y: number, text: string, style?: Style, width?: number): void {
  const max = width ?? (buf.width - x);
  buf.write(x, y, truncateText(text, max), style, max);
}

export function drawBox(buf: CellBuffer, rect: Rect, title?: string, style: Style = { tone: "muted" }): void {
  if (rect.w < 2 || rect.h < 2) return;
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.w - 1;
  const y1 = rect.y + rect.h - 1;
  buf.set(x0, y0, BOX.tl, style);
  buf.set(x1, y0, BOX.tr, style);
  buf.set(x0, y1, BOX.bl, style);
  buf.set(x1, y1, BOX.br, style);
  for (let x = x0 + 1; x < x1; x++) {
    buf.set(x, y0, BOX.h, style);
    buf.set(x, y1, BOX.h, style);
  }
  for (let y = y0 + 1; y < y1; y++) {
    buf.set(x0, y, BOX.v, style);
    buf.set(x1, y, BOX.v, style);
  }
  if (title) {
    const label = ` ${truncateText(title, Math.max(0, rect.w - 4))} `;
    buf.write(x0 + 2, y0, label, { ...style, bold: true }, rect.w - 4);
  }
}

export function drawRule(buf: CellBuffer, x: number, y: number, width: number, title?: string, style: Style = { tone: "muted" }): void {
  if (width <= 0) return;
  buf.write(x, y, BOX.h.repeat(width), style, width);
  if (title) buf.write(x + 2, y, ` ${truncateText(title, width - 4)} `, { ...style, bold: true }, width - 4);
}

export function drawMeter(buf: CellBuffer, x: number, y: number, width: number, value: number, tone: Tone): void {
  const clamped = Math.max(0, Math.min(1, value));
  const fill = Math.round(width * clamped);
  const text = `${"▰".repeat(fill)}${"▱".repeat(Math.max(0, width - fill))}`;
  buf.write(x, y, text, { tone }, width);
}

export function sparkline(values: number[], width: number): string {
  if (width <= 0) return "";
  if (values.length === 0) return " ".repeat(width);
  const chars = "▁▂▃▄▅▆▇█";
  const sample = resample(values, width);
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = Math.max(1, max - min);
  return sample.map((value) => chars[Math.max(0, Math.min(chars.length - 1, Math.round(((value - min) / range) * (chars.length - 1))))]).join("");
}

export function drawSparkline(buf: CellBuffer, x: number, y: number, width: number, values: number[], tone: Tone): void {
  buf.write(x, y, sparkline(values, width), { tone }, width);
}

export function drawMenu(buf: CellBuffer, rect: Rect, items: MenuItem[], selected: number, offset = 0): void {
  let y = rect.y;
  let lastSection = "";
  for (let i = offset; i < items.length && y < rect.y + rect.h; i++) {
    const item = items[i];
    if (item.section && item.section !== lastSection) {
      if (y + 1 < rect.y + rect.h) {
        lastSection = item.section;
        buf.write(rect.x, y, `╭─ ${truncateText(item.section, rect.w - 3)}`, { tone: "primary", bold: true }, rect.w);
        y++;
      }
    }
    if (y >= rect.y + rect.h) break;
    const active = i === selected;
    const glyph = (item.glyph ?? item.value.slice(0, 3).toUpperCase()).padEnd(3).slice(0, 3);
    const hintBudget = item.hint ? Math.max(0, Math.floor(rect.w * 0.34)) : 0;
    const labelBudget = Math.max(6, rect.w - hintBudget - 12);
    const label = truncateText(item.label, labelBudget);
    const hint = item.hint ? truncateText(item.hint, hintBudget) : "";
    const prefix = active ? "│ › " : "│   ";
    const line = `${prefix}[${glyph}] ${label}${hint ? `  ${hint}` : ""}`;
    buf.write(rect.x, y, fitDisplay(line, rect.w), {
      tone: active ? "primary" : item.tone ?? "normal",
      bold: active,
      inverse: active,
    }, rect.w);
    y++;
  }
}

export function drawTable(
  buf: CellBuffer,
  rect: Rect,
  columns: Array<{ title: string; width: number; tone?: Tone }>,
  rows: string[][],
): void {
  const total = columns.reduce((sum, col) => sum + col.width, 0) + Math.max(0, columns.length - 1);
  let x = rect.x;
  columns.forEach((col, i) => {
    buf.write(x, rect.y, fitDisplay(col.title, col.width), { tone: col.tone ?? "muted", bold: true }, col.width);
    x += col.width + (i === columns.length - 1 ? 0 : 1);
  });
  drawRule(buf, rect.x, rect.y + 1, Math.min(rect.w, total), undefined, { tone: "muted" });
  for (let r = 0; r < rows.length && r + 2 < rect.h; r++) {
    x = rect.x;
    const row = rows[r];
    columns.forEach((col, i) => {
      const text = row[i] ?? "";
      buf.write(x, rect.y + r + 2, fitDisplay(text, col.width), { tone: "normal" }, col.width);
      x += col.width + (i === columns.length - 1 ? 0 : 1);
    });
  }
}

export function inner(rect: Rect, pad = 1): Rect {
  return {
    x: rect.x + pad,
    y: rect.y + pad,
    w: Math.max(0, rect.w - pad * 2),
    h: Math.max(0, rect.h - pad * 2),
  };
}

export function contentWidth(...parts: string[]): number {
  return parts.reduce((sum, part) => sum + displayWidth(part), 0);
}

function resample(values: number[], width: number): number[] {
  if (values.length === width) return values;
  if (values.length === 1) return Array.from({ length: width }, () => values[0] ?? 0);
  return Array.from({ length: width }, (_, i) => {
    const idx = Math.floor((i / Math.max(1, width - 1)) * (values.length - 1));
    return values[idx] ?? 0;
  });
}
