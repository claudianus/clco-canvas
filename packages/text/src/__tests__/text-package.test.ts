import { describe, expect, it } from "vitest";
import { displayWidth, truncateText, fitDisplay, stripAnsi, normalizePastedLineInput, segmentGraphemes, displayBytes } from "../measure.js";
import { wrapText, alignText, wrapLines } from "../wrap.js";

describe("@clco-canvas/text measure", () => {
  it("displayWidth measures ASCII", () => {
    expect(displayWidth("Hello")).toBe(5);
    expect(displayWidth("")).toBe(0);
  });

  it("displayWidth measures CJK as 2", () => {
    expect(displayWidth("한글")).toBe(4);
    expect(displayWidth("日本語")).toBe(6);
  });

  it("displayWidth measures mixed", () => {
    expect(displayWidth("Hello한글")).toBe(9);
  });

  it("truncateText clips to width", () => {
    expect(truncateText("Hello World", 5)).toBe("Hello");
    expect(truncateText("한글테스트", 4)).toBe("한글");
  });

  it("fitDisplay pads to width", () => {
    expect(fitDisplay("Hi", 5)).toBe("Hi   ");
    expect(fitDisplay("한글", 4)).toBe("한글");
  });

  it("stripAnsi removes escape sequences", () => {
    expect(stripAnsi("\x1b[31mRed\x1b[0m")).toBe("Red");
  });

  it("normalizePastedLineInput strips ANSI and CR", () => {
    expect(normalizePastedLineInput("\x1b[32mGreen\r\n")).toBe("Green\n");
  });

  it("segmentGraphemes handles emoji", () => {
    const segs = segmentGraphemes("👋🌍");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toBe("👋");
  });

  it("displayBytes measures code units up to width", () => {
    expect(displayBytes("Hello World", 5)).toBe(5);
    // "한" is display width 2, 1 JS code unit
    expect(displayBytes("한글", 2)).toBe(1);
  });
});

describe("@clco-canvas/text wrap", () => {
  it("word wraps at width", () => {
    const lines = wrapText("Hello beautiful world", { width: 12 });
    expect(lines[0]).toBe("Hello");
    expect(lines[1]).toBe("beautiful");
  });

  it("char wraps at width", () => {
    const lines = wrapText("ABCDEFGH", { width: 3, mode: "char" });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("ABC");
  });

  it("alignText centers", () => {
    expect(alignText("Hi", 10, "center")).toBe("    Hi    ");
  });

  it("alignText right-aligns", () => {
    expect(alignText("Hi", 10, "right")).toBe("        Hi");
  });

  it("wrapLines handles explicit newlines", () => {
    const lines = wrapLines("Line1\nLine2", 20);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Line1");
  });

  it("handles empty text", () => {
    expect(wrapText("", { width: 10 })).toEqual([]);
    expect(wrapText("", { width: 0 })).toEqual([]);
  });

  it("CJK word wrap breaks at characters", () => {
    const lines = wrapText("안녕하세요 세계", { width: 6 });
    // "안녕하" (6w), "세요" (4w), "세계" (4w) — each fits within 6
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("안녕하");
  });
});
