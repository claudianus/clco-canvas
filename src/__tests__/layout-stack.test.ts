import { describe, expect, it } from "vitest";
import { hStack, vStack } from "../layout/stack.js";
import { fixed, flex } from "../layout/constraint.js";

describe("vStack", () => {
  it("splits a rect into rows", () => {
    const rect = { x: 0, y: 0, w: 40, h: 10 };
    const rows = vStack(rect, [fixed(4), flex(1)]);
    expect(rows).toHaveLength(2);
    expect(rows[0].h).toBe(4);
    expect(rows[1].h).toBe(6);
    expect(rows[0].x).toBe(0);
    expect(rows[1].y).toBe(4);
  });

  it("handles gap between rows", () => {
    const rect = { x: 0, y: 0, w: 20, h: 5 };
    const rows = vStack(rect, [fixed(2), flex(1)], 1);
    expect(rows).toHaveLength(2);
    // total=5, gap=1 → usable=4
    // fixed(2) → 2, flex(1) → 2
    expect(rows[0].h).toBe(2);
    expect(rows[1].y).toBe(3); // 2 + 1 gap
  });

  it("handles empty constraints", () => {
    expect(vStack({ x: 0, y: 0, w: 10, h: 10 }, [])).toEqual([]);
  });
});

describe("hStack", () => {
  it("splits a rect into columns", () => {
    const rect = { x: 0, y: 0, w: 20, h: 5 };
    const cols = hStack(rect, [fixed(8), flex(1)]);
    expect(cols).toHaveLength(2);
    expect(cols[0].w).toBe(8);
    expect(cols[1].w).toBe(12);
  });

  it("handles gap between columns", () => {
    const rect = { x: 0, y: 0, w: 10, h: 3 };
    const cols = hStack(rect, [fixed(4), flex(1)], 1);
    expect(cols).toHaveLength(2);
    expect(cols[0].w).toBe(4);
    expect(cols[1].x).toBe(5); // 4 + 1 gap
  });
});
