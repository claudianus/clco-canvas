import { describe, expect, it } from "vitest";
import { CellBuffer } from "../buffer/cell-buffer.js";

describe("CellBuffer", () => {
  it("creates a buffer of the given size", () => {
    const buf = new CellBuffer(10, 5);
    expect(buf.width).toBe(10);
    expect(buf.height).toBe(5);
  });

  it("creates a buffer with minimum dimensions", () => {
    const buf = new CellBuffer(0, -1);
    expect(buf.width).toBe(1);
    expect(buf.height).toBe(1);
  });

  it("has empty cells on creation", () => {
    const buf = new CellBuffer(3, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 3; x++) {
        expect(buf.get(x, y).ch).toBe(" ");
      }
    }
  });

  it("sets and gets a cell", () => {
    const buf = new CellBuffer(3, 2);
    buf.set(1, 0, "X", { bold: true });
    const cell = buf.get(1, 0);
    expect(cell.ch).toBe("X");
    expect(cell.style.bold).toBe(true);
  });

  it("ignores out-of-bounds sets", () => {
    const buf = new CellBuffer(3, 2);
    buf.set(10, 10, "X");
    expect(buf.get(1, 1).ch).toBe(" ");
  });

  it("fills a rectangle", () => {
    const buf = new CellBuffer(5, 5);
    buf.fillRect({ x: 1, y: 1, w: 3, h: 2 }, "#");
    expect(buf.get(1, 1).ch).toBe("#");
    expect(buf.get(3, 2).ch).toBe("#");
    expect(buf.get(0, 0).ch).toBe(" ");
    expect(buf.get(4, 4).ch).toBe(" ");
  });

  it("writes text with CJK correctness", () => {
    const buf = new CellBuffer(10, 2);
    buf.write(0, 0, "a한b");
    expect(buf.get(0, 0).ch).toBe("a");
    expect(buf.get(1, 0).ch).toBe("한");
    expect(buf.get(2, 0).ch).toBe(""); // CJK trailing cell
    expect(buf.get(3, 0).ch).toBe("b");
  });

  it("writes text within maxWidth", () => {
    const buf = new CellBuffer(5, 1);
    buf.write(0, 0, "hello world", {}, 5);
    expect(buf.get(0, 0).ch).toBe("h");
    expect(buf.get(4, 0).ch).toBe("o");
  });

  it("clones independently", () => {
    const buf = new CellBuffer(2, 2);
    buf.set(0, 0, "A");
    const clone = buf.clone();
    clone.set(0, 0, "B");
    expect(buf.get(0, 0).ch).toBe("A");
    expect(clone.get(0, 0).ch).toBe("B");
  });

  it("renders full output", () => {
    const buf = new CellBuffer(3, 1);
    buf.set(0, 0, "A");
    buf.set(1, 0, "B");
    const output = buf.renderFull();
    expect(output).toContain("A");
    expect(output).toContain("B");
  });

  it("renders diff against previous", () => {
    const prev = new CellBuffer(3, 1);
    prev.set(0, 0, "A");
    const next = new CellBuffer(3, 1);
    next.set(0, 0, "A");
    next.set(1, 0, "B");
    const output = next.renderDiff(prev);
    expect(output).not.toContain("A"); // unchanged, should not re-render
    expect(output).toContain("B");
  });

  it("toPlainString extracts text", () => {
    const buf = new CellBuffer(5, 2);
    buf.write(0, 0, "hello");
    buf.write(0, 1, "world");
    expect(buf.toPlainString()).toBe("hello\nworld");
  });

  it("clears the buffer", () => {
    const buf = new CellBuffer(3, 2);
    buf.write(0, 0, "abc");
    buf.clear({ tone: "muted" });
    expect(buf.get(0, 0).ch).toBe(" ");
    expect(buf.get(0, 0).style.tone).toBe("muted");
  });

  it("merges cell background when writing without bg", () => {
    const buf = new CellBuffer(5, 1);
    buf.set(1, 0, " ", { bg: [255, 0, 0] });
    buf.write(1, 0, "X");
    const cell = buf.get(1, 0);
    expect(cell.ch).toBe("X");
    expect(cell.style.bg).toEqual([255, 0, 0]);
  });
});
