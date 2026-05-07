import { describe, expect, it } from "vitest";
import { CellBuffer } from "../buffer/cell-buffer.js";
import { drawGradientRule, drawGradientText } from "../paint/gradient.js";

describe("drawGradientRule", () => {
  it("draws a gradient rule on the buffer", () => {
    const buf = new CellBuffer(20, 3);
    drawGradientRule(buf, 0, 1, 20, [0, 214, 255], [91, 140, 255], true);
    // Should have drawn characters along x at y=1
    const cell = buf.get(0, 1);
    expect(cell.ch).toBe("─");
    expect(cell.style.tone).toBe("primary");
  });

  it("falls back to tones when trueColor is false", () => {
    const buf = new CellBuffer(20, 3);
    drawGradientRule(buf, 0, 1, 20, [0, 214, 255], [91, 140, 255], false);
    const cell = buf.get(0, 1);
    expect(cell.ch).toBe("─");
    // Under false trueColor, use tones instead of fg
  });

  it("handles zero width gracefully", () => {
    const buf = new CellBuffer(10, 3);
    drawGradientRule(buf, 0, 1, 0, [0, 0, 0], [255, 255, 255], true);
    // Should not throw
  });
});

describe("drawGradientText", () => {
  it("draws gradient colored text", () => {
    const buf = new CellBuffer(20, 3);
    drawGradientText(buf, 0, 1, "hello", 20, [0, 214, 255], [91, 140, 255], true);
    // First char should have a color
    const cell = buf.get(0, 1);
    expect(cell.ch).toBe("h");
    expect(cell.style.tone).toBe("primary");
    expect(cell.style.fg).toBeDefined();
  });

  it("falls back to tone when trueColor is false", () => {
    const buf = new CellBuffer(20, 3);
    drawGradientText(buf, 0, 1, "hello", 20, [0, 214, 255], [91, 140, 255], false);
    const cell = buf.get(0, 1);
    expect(cell.ch).toBe("h");
    expect(cell.style.tone).toBe("primary");
    expect(cell.style.bold).toBe(true);
  });

  it("handles empty text", () => {
    const buf = new CellBuffer(10, 3);
    drawGradientText(buf, 0, 1, "", 10, [0, 0, 0], [255, 255, 255], true);
    // Should not throw
  });
});
