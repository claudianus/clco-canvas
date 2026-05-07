import { describe, expect, it } from "vitest";
import {
  createViewport,
  scrollViewport,
  scrollToViewport,
  scrollToEnd,
  scrollToStart,
  clampViewport,
  visibleRange,
  viewportRatio,
} from "../layout/viewport.js";

describe("createViewport", () => {
  it("starts at offset 0", () => {
    const vp = createViewport(50, 10);
    expect(vp.offset).toBe(0);
    expect(vp.contentHeight).toBe(50);
    expect(vp.viewHeight).toBe(10);
  });
});

describe("scrollViewport", () => {
  it("adds delta to offset", () => {
    const vp = createViewport(50, 10);
    const scrolled = scrollViewport(vp, 5);
    expect(scrolled.offset).toBe(5);
  });

  it("clamps at bottom", () => {
    const vp = createViewport(50, 10);
    const scrolled = scrollViewport(vp, 999);
    expect(scrolled.offset).toBe(40); // max offset = 50 - 10
  });

  it("clamps at top", () => {
    const vp = createViewport(50, 10);
    const scrolled = scrollViewport(vp, -10);
    expect(scrolled.offset).toBe(0);
  });
});

describe("scrollTo", () => {
  it("scrolls to specific offset", () => {
    const vp = createViewport(50, 10);
    expect(scrollToViewport(vp, 20).offset).toBe(20);
  });

  it("scrollToEnd goes to max offset", () => {
    const vp = createViewport(50, 10);
    expect(scrollToEnd(vp).offset).toBe(40);
  });

  it("scrollToStart goes to 0", () => {
    const vp = scrollViewport(createViewport(50, 10), 30);
    expect(scrollToStart(vp).offset).toBe(0);
  });
});

describe("clampViewport", () => {
  it("clamps negative offset to 0", () => {
    const vp = { offset: -5, contentHeight: 50, viewHeight: 10 };
    expect(clampViewport(vp).offset).toBe(0);
  });

  it("clamps beyond-end offset to max", () => {
    const vp = { offset: 100, contentHeight: 50, viewHeight: 10 };
    expect(clampViewport(vp).offset).toBe(40);
  });

  it("keeps valid offset unchanged", () => {
    const vp = { offset: 15, contentHeight: 50, viewHeight: 10 };
    expect(clampViewport(vp).offset).toBe(15);
  });
});

describe("visibleRange", () => {
  it("returns visible row range", () => {
    const vp = scrollViewport(createViewport(50, 10), 7);
    const range = visibleRange(vp);
    expect(range.start).toBe(7);
    expect(range.end).toBe(17);
  });

  it("caps end to contentHeight", () => {
    const vp = scrollToEnd(createViewport(50, 10));
    const range = visibleRange(vp);
    expect(range.end).toBe(50);
  });
});

describe("viewportRatio", () => {
  it("computes thumb ratio", () => {
    const vp = createViewport(100, 20);
    const r = viewportRatio(vp);
    expect(r.size).toBe(0.2); // 20/100
    expect(r.position).toBe(0);
  });

  it("computes position mid-scroll", () => {
    const vp = scrollViewport(createViewport(100, 20), 40);
    const r = viewportRatio(vp);
    expect(r.position).toBeGreaterThan(0);
    expect(r.position).toBeLessThan(1);
  });

  it("returns full size when content fits", () => {
    const vp = createViewport(5, 10);
    const r = viewportRatio(vp);
    expect(r.size).toBe(1);
    expect(r.position).toBe(0);
  });
});
