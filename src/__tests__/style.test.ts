import { describe, expect, it } from "vitest";
import { applyStyle, styleOpen } from "../terminal/ansi.js";

describe("applyStyle", () => {
  it("returns plain text for empty style", () => {
    expect(applyStyle("hello")).toBe("hello");
  });
  it("wraps styled text with reset", () => {
    const result = applyStyle("hello", { bold: true });
    expect(result).toContain("hello");
    expect(result).toContain("\x1b[0m");
    expect(result.startsWith("\x1b[")).toBe(true);
  });
});

describe("styleOpen", () => {
  it("emits bold", () => {
    expect(styleOpen({ bold: true })).toContain("1");
  });
  it("emits dim", () => {
    expect(styleOpen({ dim: true })).toContain("2");
  });
  it("emits italic", () => {
    const code = styleOpen({ italic: true });
    expect(code).toContain("3");
  });
  it("emits underline", () => {
    const code = styleOpen({ underline: true });
    expect(code).toContain("4");
  });
  it("emits inverse", () => {
    expect(styleOpen({ inverse: true })).toContain("7");
  });
  it("emits strikethrough", () => {
    const code = styleOpen({ strikethrough: true });
    expect(code).toContain("9");
  });
  it("combines multiple attributes", () => {
    const code = styleOpen({ bold: true, italic: true, underline: true });
    expect(code).toContain("1");
    expect(code).toContain("3");
    expect(code).toContain("4");
  });
  it("emits truecolor foreground", () => {
    const code = styleOpen({ fg: [255, 128, 64] });
    expect(code).toContain("38;2;255;128;64");
  });
  it("emits truecolor background", () => {
    const code = styleOpen({ bg: [0, 255, 0] });
    expect(code).toContain("48;2;0;255;0");
  });
  it("emits tone as ANSI color", () => {
    const code = styleOpen({ tone: "primary" });
    expect(code).toContain("36"); // cyan
  });
});
