import type { Cell, Rect, Rgb, Style } from "../types.js";
import { displayWidth, segmentGraphemes } from "../text/measure.js";
import { applyStyle, cursorTo } from "../terminal/ansi.js";

const EMPTY_STYLE: Style = {};

export class CellBuffer {
  readonly width: number;
  readonly height: number;
  private cells: Cell[];

  constructor(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.cells = Array.from({ length: this.width * this.height }, () => ({ ch: " ", style: EMPTY_STYLE }));
  }

  clone(): CellBuffer {
    const next = new CellBuffer(this.width, this.height);
    next.cells = this.cells.map((cell) => ({ ch: cell.ch, style: { ...cell.style } }));
    return next;
  }

  clear(style: Style = EMPTY_STYLE): void {
    this.cells = Array.from({ length: this.width * this.height }, () => ({ ch: " ", style }));
  }

  set(x: number, y: number, ch: string, style: Style = EMPTY_STYLE): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = { ch, style: this.mergeCellBackground(x, y, style) };
  }

  get(x: number, y: number): Cell {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return { ch: " ", style: EMPTY_STYLE };
    return this.cells[y * this.width + x] ?? { ch: " ", style: EMPTY_STYLE };
  }

  write(x: number, y: number, text: string, style: Style = EMPTY_STYLE, maxWidth = this.width - x): void {
    if (y < 0 || y >= this.height || maxWidth <= 0) return;
    let col = x;
    let used = 0;
    for (const segment of segmentGraphemes(text)) {
      const width = displayWidth(segment);
      if (used + width > maxWidth) break;
      if (width <= 0) continue;
      this.set(col, y, segment, style);
      if (width === 2) this.set(col + 1, y, "", style);
      col += width;
      used += width;
      if (col >= this.width) break;
    }
  }

  fillRect(rect: Rect, ch = " ", style: Style = EMPTY_STYLE): void {
    const x0 = clamp(rect.x, 0, this.width);
    const y0 = clamp(rect.y, 0, this.height);
    const x1 = clamp(rect.x + rect.w, 0, this.width);
    const y1 = clamp(rect.y + rect.h, 0, this.height);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) this.set(x, y, ch, style);
    }
  }

  renderFull(): string {
    let out = "";
    for (let y = 0; y < this.height; y++) {
      out += cursorTo(0, y) + this.renderRow(y);
    }
    return out;
  }

  renderDiff(prev: CellBuffer | null): string {
    if (!prev || prev.width !== this.width || prev.height !== this.height) return this.renderFull();
    let out = "";
    for (let y = 0; y < this.height; y++) {
      if (this.rowEquals(prev, y)) continue;
      for (const span of this.changedSpans(prev, y)) {
        out += cursorTo(span.start, y) + this.renderSpan(y, span.start, span.end);
      }
    }
    return out;
  }

  toPlainString(): string {
    const rows: string[] = [];
    for (let y = 0; y < this.height; y++) {
      let row = "";
      for (let x = 0; x < this.width; x++) {
        const ch = this.get(x, y).ch;
        row += ch === "" ? "" : ch;
      }
      rows.push(row.replace(/\s+$/g, ""));
    }
    return rows.join("\n").replace(/\n+$/g, "");
  }

  private renderRow(y: number): string {
    let row = "";
    let current = "";
    let visualWidth = 0;
    for (let x = 0; x < this.width; x++) {
      const cell = this.get(x, y);
      const key = styleKey(cell.style);
      if (key !== current) {
        if (current) row += "\x1b[0m";
        current = key;
        if (key) row += styleToAnsi(cell.style);
      }
      if (cell.ch !== "") {
        row += cell.ch;
        visualWidth += displayWidth(cell.ch);
      }
    }
    if (visualWidth < this.width) row += " ".repeat(this.width - visualWidth);
    if (current) row += "\x1b[0m";
    return row;
  }

  private rowEquals(prev: CellBuffer, y: number): boolean {
    for (let x = 0; x < this.width; x++) {
      const a = this.get(x, y);
      const b = prev.get(x, y);
      if (a.ch !== b.ch || styleKey(a.style) !== styleKey(b.style)) return false;
    }
    return true;
  }

  private changedSpans(prev: CellBuffer, y: number): Array<{ start: number; end: number }> {
    const spans: Array<{ start: number; end: number }> = [];
    let x = 0;
    while (x < this.width) {
      while (x < this.width && this.cellEquals(prev, x, y)) x += 1;
      if (x >= this.width) break;
      let start = x;
      while (start > 0 && this.get(start, y).ch === "") start -= 1;
      while (x < this.width && !this.cellEquals(prev, x, y)) x += 1;
      let end = x;
      while (end < this.width && this.get(end, y).ch === "") end += 1;
      const previous = spans.at(-1);
      if (previous && start <= previous.end + 1) {
        previous.end = Math.max(previous.end, end);
      } else {
        spans.push({ start, end });
      }
    }
    return spans;
  }

  private cellEquals(prev: CellBuffer, x: number, y: number): boolean {
    const a = this.get(x, y);
    const b = prev.get(x, y);
    return a.ch === b.ch && styleKey(a.style) === styleKey(b.style);
  }

  private renderSpan(y: number, start: number, end: number): string {
    let row = "";
    let current = "";
    for (let x = Math.max(0, start); x < Math.min(this.width, end); x++) {
      const cell = this.get(x, y);
      const key = styleKey(cell.style);
      if (key !== current) {
        if (current) row += "\x1b[0m";
        current = key;
        if (key) row += styleToAnsi(cell.style);
      }
      if (cell.ch !== "") row += cell.ch;
    }
    if (current) row += "\x1b[0m";
    return row;
  }

  private mergeCellBackground(x: number, y: number, style: Style): Style {
    if (style.bg) return style;
    const existingBg = this.get(x, y).style.bg;
    return existingBg ? { ...style, bg: existingBg } : style;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function styleKey(style: Style): string {
  return `${style.tone ?? ""}:${rgbKey(style.fg)}:${rgbKey(style.bg)}:${style.bold ? "b" : ""}:${style.dim ? "d" : ""}:${style.inverse ? "i" : ""}`;
}

function styleToAnsi(style: Style): string {
  return applyStyle("", style).replace(/\x1b\[0m$/, "");
}

function rgbKey(rgb: Rgb | undefined): string {
  return rgb ? rgb.join(",") : "";
}
