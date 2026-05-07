import { describe, expect, it } from "vitest";
import { resolveGrid, GridCell } from "../layout/grid-layout.js";
import { fixed, flex } from "../layout/constraint.js";

describe("resolveGrid", () => {
  it("computes cell rects for a simple 2x2 grid", () => {
    const rect = { x: 0, y: 0, w: 20, h: 10 };
    const def = {
      rows: [fixed(5), flex(1)],
      cols: [fixed(10), flex(1)],
    };
    const grid = resolveGrid(rect, def);

    const c00: GridCell = { row: 0, col: 0 };
    const r00 = grid.cellRect(c00);
    expect(r00.x).toBe(0);
    expect(r00.y).toBe(0);
    expect(r00.w).toBe(10);
    expect(r00.h).toBe(5);

    const c11: GridCell = { row: 1, col: 1 };
    const r11 = grid.cellRect(c11);
    expect(r11.x).toBe(10);
    expect(r11.y).toBe(5);
    expect(r11.w).toBe(10);
    expect(r11.h).toBe(5);
  });

  it("handles cell spanning", () => {
    const rect = { x: 0, y: 0, w: 30, h: 12 };
    const def = {
      rows: [fixed(4), fixed(4), fixed(4)],
      cols: [fixed(10), fixed(10), fixed(10)],
    };
    const grid = resolveGrid(rect, def);

    // Span all 3 columns
    const fullWidth: GridCell = { row: 0, col: 0, colSpan: 3 };
    const r = grid.cellRect(fullWidth);
    expect(r.w).toBe(30);

    // Span 2 rows
    const twoRows: GridCell = { row: 1, col: 0, rowSpan: 2 };
    const r2 = grid.cellRect(twoRows);
    expect(r2.h).toBe(8);
  });

  it("applies gap between cells", () => {
    const rect = { x: 5, y: 5, w: 14, h: 9 };
    const def = {
      rows: [fixed(4), fixed(4)],
      cols: [fixed(6), fixed(6)],
      gap: 1,
    };
    const grid = resolveGrid(rect, def);

    const c10: GridCell = { row: 1, col: 0 };
    const r10 = grid.cellRect(c10);
    expect(r10.y).toBe(10); // 5 + 4 + 1 gap
    expect(r10.x).toBe(5);

    const c01: GridCell = { row: 0, col: 1 };
    const r01 = grid.cellRect(c01);
    expect(r01.x).toBe(12); // 5 + 6 + 1 gap
  });
});
