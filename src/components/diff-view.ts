import type { Rect, Style, Tone } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { fitDisplay } from "../text/measure.js";

export type DiffLineType = "add" | "remove" | "context" | "header";

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffViewState {
  lines: DiffLine[];
  scroll: number;
  focused?: boolean;
}

const LINE_TONE: Record<DiffLineType, Tone> = {
  add: "success",
  remove: "danger",
  context: "muted",
  header: "info",
};

const LINE_PREFIX: Record<DiffLineType, string> = {
  add: "+",
  remove: "-",
  context: " ",
  header: "@",
};

export function drawDiffView(
  buf: CellBuffer,
  rect: Rect,
  state: DiffViewState,
  style: Style = {},
): void {
  const gutterW = 5;
  const contentX = rect.x + gutterW;
  const contentW = Math.max(0, rect.w - gutterW);

  let y = rect.y;
  for (let i = state.scroll; i < state.lines.length && y < rect.y + rect.h; i++) {
    const line = state.lines[i];
    const tone = LINE_TONE[line.type];
    const prefix = LINE_PREFIX[line.type];

    // Gutter
    let gutter = "";
    if (line.type === "header") {
      gutter = "".padStart(gutterW);
    } else if (line.type === "remove") {
      gutter = (line.oldLine?.toString() ?? "").padStart(gutterW);
    } else if (line.type === "add") {
      gutter = (line.newLine?.toString() ?? `+`).padStart(gutterW);
    } else {
      gutter = (line.oldLine?.toString() ?? "").padStart(gutterW);
    }

    buf.write(rect.x, y, gutter, { tone: "muted", dim: true, ...style }, gutterW);
    buf.write(contentX, y, `${prefix} `, { tone, bold: true, ...style }, 2);

    const textStart = contentX + 2;
    const textW = Math.max(0, contentW - 2);
    buf.write(textStart, y, fitDisplay(line.content, textW), { tone, ...style }, textW);

    // Highlight background for add/remove lines
    if (line.type === "add" || line.type === "remove") {
      for (let x = rect.x; x < rect.x + rect.w && x < buf.width; x++) {
        const cell = buf.get(x, y);
        buf.set(x, y, cell.ch, { ...cell.style, bg: tone === "success" ? [0, 40, 0] : [40, 0, 0] });
      }
    }

    y++;
  }
}

export function parseUnifiedDiff(diffText: string): DiffLine[] {
  if (!diffText) return [];
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of diffText.split("\n")) {
    if (!raw) continue;
    if (raw.startsWith("@@")) {
      const match = raw.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      lines.push({ type: "header", content: raw });
    } else if (raw.startsWith("+")) {
      lines.push({ type: "add", content: raw.slice(1), newLine: newLine++ });
    } else if (raw.startsWith("-")) {
      lines.push({ type: "remove", content: raw.slice(1), oldLine: oldLine++ });
    } else {
      lines.push({ type: "context", content: raw.startsWith(" ") ? raw.slice(1) : raw, oldLine: oldLine++, newLine: newLine++ });
    }
  }

  return lines;
}
