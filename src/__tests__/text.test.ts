import { describe, expect, it } from "vitest";
import { displayWidth, segmentGraphemes, stripAnsi, truncateText, padEndDisplay, sliceDisplay, normalizePastedLineInput } from "../text/measure.js";

describe("displayWidth", () => {
  it("returns 1 for ASCII", () => {
    expect(displayWidth("hello")).toBe(5);
  });
  it("returns 2 for CJK", () => {
    expect(displayWidth("안녕")).toBe(4);
  });
  it("returns 0 for empty string", () => {
    expect(displayWidth("")).toBe(0);
  });
  it("measures mixed text", () => {
    expect(displayWidth("a한b")).toBe(4);
  });
  it("strips ANSI before measuring", () => {
    expect(displayWidth("\x1b[31mhello\x1b[0m")).toBe(5);
  });
});

describe("segmentGraphemes", () => {
  it("splits ASCII into chars", () => {
    expect(segmentGraphemes("abc")).toEqual(["a", "b", "c"]);
  });
  it("keeps CJK intact", () => {
    expect(segmentGraphemes("가나다")).toEqual(["가", "나", "다"]);
  });
  it("handles emoji", () => {
    const segments = segmentGraphemes("👋🌍");
    expect(segments.length).toBe(2);
  });
});

describe("stripAnsi", () => {
  it("removes escape sequences", () => {
    expect(stripAnsi("\x1b[31mred\x1b[0m")).toBe("red");
  });
  it("returns plain text unchanged", () => {
    expect(stripAnsi("hello")).toBe("hello");
  });
});

describe("truncateText", () => {
  it("returns text unchanged if it fits", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });
  it("adds ellipsis for overflow", () => {
    const result = truncateText("very long text", 7);
    expect(displayWidth(result)).toBeLessThanOrEqual(7);
    expect(result).toContain("…");
  });
  it("handles CJK overflow", () => {
    const result = truncateText("안녕하세요", 5);
    expect(displayWidth(result)).toBeLessThanOrEqual(5);
  });
});

describe("padEndDisplay", () => {
  it("pads to display width", () => {
    const result = padEndDisplay("hi", 6);
    expect(displayWidth(result)).toBe(6);
  });
});

describe("sliceDisplay", () => {
  it("slices at CJK boundaries", () => {
    const result = sliceDisplay("a한b글c", 0, 4);
    expect(result).toBe("a한b");
  });
});

describe("normalizePastedLineInput", () => {
  it("trims trailing newline", () => {
    expect(normalizePastedLineInput("hello\n")).toBe("hello");
  });
  it("strips ANSI escape sequences", () => {
    const result = normalizePastedLineInput("\x1b[31ma\x1b[0m");
    expect(result).toBe("a");
  });
  it("strips lone carriage returns", () => {
    expect(normalizePastedLineInput("a\rb")).toBe("ab");
  });
  it("keeps CRLF as newline", () => {
    const result = normalizePastedLineInput("a\r\nb");
    expect(result).not.toContain("\r");
  });
});
