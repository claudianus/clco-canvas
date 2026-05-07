import { displayWidth, segmentGraphemes, stripAnsi } from "./measure.js";
import type { Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";

export type TextAlign = "left" | "center" | "right";
export type WrapMode = "word" | "char";

export interface WrapOptions {
  width: number;
  mode?: WrapMode;
  align?: TextAlign;
  indent?: number;
  hangingIndent?: number;
}

interface WrapUnit {
  text: string;
  width: number;
  isSpace: boolean;
}

function tokenize(text: string): WrapUnit[] {
  const segments = segmentGraphemes(text);
  const units: WrapUnit[] = [];
  let word = "";
  let wordWidth = 0;

  for (const seg of segments) {
    const w = displayWidth(seg);
    if (seg === " ") {
      if (word.length > 0) {
        units.push({ text: word, width: wordWidth, isSpace: false });
        word = "";
        wordWidth = 0;
      }
      units.push({ text: " ", width: 1, isSpace: true });
    } else if (isCJKBreakable(seg)) {
      if (word.length > 0) {
        units.push({ text: word, width: wordWidth, isSpace: false });
        word = "";
        wordWidth = 0;
      }
      units.push({ text: seg, width: w, isSpace: false });
    } else {
      word += seg;
      wordWidth += w;
    }
  }
  if (word.length > 0) {
    units.push({ text: word, width: wordWidth, isSpace: false });
  }

  return units;
}

function isCJKBreakable(segment: string): boolean {
  const code = segment.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

export function wrapText(text: string, options: WrapOptions): string[] {
  const { width, mode = "word", indent = 0, hangingIndent = 0 } = options;
  if (width <= 0) return [];
  const clean = stripAnsi(text);
  if (clean.length === 0) return [];

  const units =
    mode === "word"
      ? tokenize(clean)
      : segmentGraphemes(clean).map((seg) => ({
          text: seg,
          width: displayWidth(seg),
          isSpace: seg === " ",
        }));

  const lines: string[] = [];
  let i = 0;

  while (i < units.length) {
    const lineIndent = lines.length === 0 ? indent : hangingIndent;
    const available = Math.max(0, width - lineIndent);
    if (available <= 0) break;

    let lineWidth = 0;
    let lineEnd = i;

    while (lineEnd < units.length) {
      const unit = units[lineEnd];
      if (lineWidth === 0 && unit.isSpace) {
        lineEnd++;
        continue;
      }
      if (lineWidth + unit.width > available) break;
      lineWidth += unit.width;
      lineEnd++;
    }

    if (lineEnd === i) {
      const unit = units[i];
      if (unit.isSpace) {
        i++;
        continue;
      }
      const partial = forceFit(unit.text, available);
      lines.push(" ".repeat(lineIndent) + partial);
      const remaining = unit.text.slice(partial.length);
      if (remaining.length > 0) {
        units.splice(i + 1, 0, {
          text: remaining,
          width: displayWidth(remaining),
          isSpace: false,
        });
      }
      i++;
      continue;
    }

    // Build line, skip leading spaces
    let lineStartIdx = i;
    while (lineStartIdx < lineEnd && units[lineStartIdx].isSpace) {
      lineStartIdx++;
    }
    let lineText = "";
    for (let j = lineStartIdx; j < lineEnd; j++) {
      lineText += units[j].text;
    }
    if (mode === "word") lineText = lineText.replace(/\s+$/, "");
    lines.push(" ".repeat(lineIndent) + lineText);
    i = lineEnd;
  }

  return lines.length > 0 ? lines : [""];
}

function forceFit(text: string, width: number): string {
  const segs = segmentGraphemes(text);
  let result = "";
  let used = 0;
  for (const seg of segs) {
    const w = displayWidth(seg);
    if (used + w > width) break;
    result += seg;
    used += w;
  }
  return result || (segs[0] ?? "");
}

export function alignText(line: string, width: number, align: TextAlign): string {
  const dw = displayWidth(line);
  if (dw >= width) return line;
  const pad = width - dw;
  switch (align) {
    case "left":
      return line + " ".repeat(pad);
    case "right":
      return " ".repeat(pad) + line;
    case "center": {
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + line + " ".repeat(pad - left);
    }
  }
}

export function renderParagraph(
  buffer: CellBuffer,
  rect: Rect,
  text: string,
  style?: Style,
  options?: Partial<Omit<WrapOptions, "width">>,
): void {
  const wrapped = wrapText(text, { width: rect.w, ...options });
  for (let i = 0; i < Math.min(wrapped.length, rect.h); i++) {
    const line = options?.align ? alignText(wrapped[i], rect.w, options.align) : wrapped[i];
    buffer.write(rect.x, rect.y + i, line, style, rect.w);
  }
}

export function wrapLines(text: string, width: number): string[] {
  return text.split("\n").flatMap((line) => wrapText(line, { width }));
}
