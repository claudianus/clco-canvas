import { describe, expect, it } from "vitest";
import { Constraint, fixed, flex, ratio, content, resolveConstraints } from "../layout/constraint.js";

describe("constraint helpers", () => {
  it("fixed creates a fixed constraint", () => {
    const c = fixed(10);
    expect(c.type).toBe("fixed");
    expect(c.value).toBe(10);
  });

  it("flex creates flex constraint with default grow", () => {
    const c = flex();
    expect(c.type).toBe("flex");
    expect(c.grow).toBe(1);
  });

  it("ratio creates ratio constraint", () => {
    const c = ratio(2);
    expect(c.type).toBe("ratio");
    expect(c.value).toBe(2);
  });

  it("content creates content constraint", () => {
    const c = content(3, 10);
    expect(c.type).toBe("content");
    expect(c.min).toBe(3);
    expect(c.max).toBe(10);
  });
});

describe("resolveConstraints", () => {
  it("divides space evenly for equal flex", () => {
    const sizes = resolveConstraints(100, [flex(1), flex(1)]);
    expect(sizes).toHaveLength(2);
    expect(sizes[0] + sizes[1]).toBe(100);
    expect(sizes[0]).toBeCloseTo(50, -1);
    expect(sizes[1]).toBeCloseTo(50, -1);
  });

  it("respects fixed constraints", () => {
    const sizes = resolveConstraints(100, [fixed(30), flex(1), flex(1)]);
    expect(sizes[0]).toBe(30);
    expect(sizes[1] + sizes[2]).toBe(70);
  });

  it("handles all fixed constraints", () => {
    const sizes = resolveConstraints(50, [fixed(10), fixed(20), fixed(20)]);
    expect(sizes).toEqual([10, 20, 20]);
  });

  it("respects ratio proportions", () => {
    const sizes = resolveConstraints(60, [ratio(1), ratio(2)]);
    expect(sizes).toHaveLength(2);
    expect(sizes[0] + sizes[1]).toBe(60);
    expect(sizes[1]).toBeGreaterThan(sizes[0]);
  });

  it("handles empty constraints", () => {
    expect(resolveConstraints(100, [])).toEqual([]);
  });
});
