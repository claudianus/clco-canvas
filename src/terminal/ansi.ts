import type { Rgb, Style, Tone } from "../types.js";

const TONE_FG: Record<Tone, number> = {
  normal: 39,
  muted: 90,
  primary: 36,
  success: 32,
  warning: 33,
  danger: 31,
  info: 34,
};

export const ANSI = {
  reset: "\x1b[0m",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  altOn: "\x1b[?1049h",
  altOff: "\x1b[?1049l",
  bracketedPasteOn: "\x1b[?2004h",
  bracketedPasteOff: "\x1b[?2004l",
  mouseOn: "\x1b[?1000h\x1b[?1006h",
  mouseOff: "\x1b[?1006l\x1b[?1000l",
  clear: "\x1b[2J\x1b[3J\x1b[H",
};

export function cursorTo(x: number, y: number): string {
  return `\x1b[${Math.max(1, y + 1)};${Math.max(1, x + 1)}H`;
}

export function styleOpen(style: Style = {}): string {
  const codes: string[] = [];
  if (style.bold) codes.push("1");
  if (style.dim) codes.push("2");
  if (style.inverse) codes.push("7");
  codes.push(style.fg ? rgbCode("38", style.fg) : String(TONE_FG[style.tone ?? "normal"]));
  if (style.bg) codes.push(rgbCode("48", style.bg));
  return `\x1b[${codes.join(";")}m`;
}

export function applyStyle(text: string, style?: Style): string {
  if (!style || Object.keys(style).length === 0) return text;
  return `${styleOpen(style)}${text}${ANSI.reset}`;
}

export function clearScreen(): void {
  if (process.stdout.isTTY) process.stdout.write(ANSI.clear);
}

function rgbCode(prefix: "38" | "48", rgb: Rgb): string {
  const [r, g, b] = rgb.map((value) => Math.max(0, Math.min(255, Math.round(value)))) as [number, number, number];
  return `${prefix};2;${r};${g};${b}`;
}
