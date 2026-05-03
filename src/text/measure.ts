const ANSI_RE = /\x1B\[[0-?]*[ -/]*[@-~]/g;

export function stripAnsi(value: string): string {
  return value.replace(ANSI_RE, "");
}

export function normalizePastedLineInput(value: string): string {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").replace(/[\r\n]+/g, "");
}

export function segmentGraphemes(value: string): string[] {
  const segmenter = getSegmenter();
  if (segmenter) {
    return [...segmenter.segment(value)].map((part) => part.segment);
  }
  return fallbackSegments(value);
}

function getSegmenter(): Intl.Segmenter | null {
  const ctor = Intl.Segmenter;
  if (typeof ctor !== "function") return null;
  return new ctor(undefined, { granularity: "grapheme" });
}

function fallbackSegments(value: string): string[] {
  const out: string[] = [];
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (out.length > 0 && isCombining(code)) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

export function displayWidth(value: string): number {
  let width = 0;
  for (const segment of segmentGraphemes(stripAnsi(value))) {
    width += segmentWidth(segment);
  }
  return width;
}

export function padEndDisplay(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - displayWidth(value)))}`;
}

export function fitDisplay(value: string, width: number): string {
  return padEndDisplay(truncateText(value, width), width);
}

export function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  const clean = stripAnsi(value);
  if (displayWidth(clean) <= maxWidth) return clean;
  if (maxWidth === 1) return "…";
  const limit = maxWidth - 1;
  let used = 0;
  let out = "";
  for (const segment of segmentGraphemes(clean)) {
    const width = segmentWidth(segment);
    if (used + width > limit) break;
    out += segment;
    used += width;
  }
  return `${out}…`;
}

export function sliceDisplay(value: string, start: number, width: number): string {
  if (width <= 0) return "";
  const clean = stripAnsi(value);
  const from = Math.max(0, start);
  let col = 0;
  let used = 0;
  let out = "";
  for (const segment of segmentGraphemes(clean)) {
    const segWidth = segmentWidth(segment);
    const next = col + segWidth;
    if (next <= from) {
      col = next;
      continue;
    }
    if (col < from) {
      col = next;
      continue;
    }
    if (used + segWidth > width) break;
    out += segment;
    used += segWidth;
    col = next;
  }
  return out;
}

export function marqueeText(value: string, width: number, frame: number): string {
  if (width <= 0) return "";
  const clean = stripAnsi(value).replace(/\s+/g, " ").trim();
  if (displayWidth(clean) <= width) return clean;
  const gap = "   ";
  const loop = `${clean}${gap}`;
  const loopWidth = displayWidth(loop);
  const offset = Math.max(0, frame % Math.max(1, loopWidth));
  return padEndDisplay(sliceDisplay(`${loop}${clean}`, offset, width), width);
}

function segmentWidth(segment: string): number {
  let max = 0;
  for (const ch of segment) {
    max = Math.max(max, charWidth(ch));
  }
  return max;
}

function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code === 0) return 0;
  if (code < 0x20 || (code >= 0x7f && code < 0xa0)) return 0;
  if (isCombining(code)) return 0;
  if (isWide(code)) return 2;
  return 1;
}

function isCombining(code: number): boolean {
  return (
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0x1ab0 && code <= 0x1aff) ||
    (code >= 0x1dc0 && code <= 0x1dff) ||
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0xfe20 && code <= 0xfe2f)
  );
}

function isWide(code: number): boolean {
  return (
    code >= 0x1100 && (
      code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff)
    )
  );
}
