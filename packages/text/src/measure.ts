// CJK-aware display width measurement
// East Asian Wide (W) and Fullwidth (F) characters = 2 columns

export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}

export function displayBytes(text: string, maxWidth: number): number {
  let width = 0;
  let bytes = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const w = isWide(cp) ? 2 : 1;
    if (width + w > maxWidth) break;
    width += w;
    bytes += ch.length;
  }
  return bytes;
}

export function segmentGraphemes(text: string): string[] {
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...seg.segment(text)].map((s) => s.segment);
}

export function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  let width = 0;
  let result = "";
  for (const segment of segmentGraphemes(text)) {
    const w = displayWidth(segment);
    if (width + w > maxWidth) break;
    result += segment;
    width += w;
  }
  if (result.length === 0) {
    const segs = segmentGraphemes(text);
    return segs[0] ?? "";
  }
  return result;
}

export function fitDisplay(text: string, width: number): string {
  const dw = displayWidth(text);
  if (dw > width) return truncateText(text, width);
  return text.padEnd(text.length + (width - dw));
}

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

export function normalizePastedLineInput(raw: string): string {
  return stripAnsi(raw).replace(/\r/g, "");
}

function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2329 && cp <= 0x232a) || // Misc Technical
    (cp >= 0x2e80 && cp <= 0xa4cf) || // CJK Radicals Supplement .. Yi
    (cp >= 0xa960 && cp <= 0xa97c) || // Hangul Jamo Extended-A
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe10 && cp <= 0xfe19) || // Vertical forms
    (cp >= 0xfe30 && cp <= 0xfe6f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth Signs
    (cp >= 0x1f300 && cp <= 0x1f64f) || // Misc Symbols and Pictographs
    (cp >= 0x1f900 && cp <= 0x1f9ff) || // Supplemental Symbols and Pictographs
    (cp >= 0x20000 && cp <= 0x2fffd) || // CJK Unified Ideographs Extension B+
    (cp >= 0x30000 && cp <= 0x3fffd) // CJK Unified Ideographs Extension G+
  );
}
