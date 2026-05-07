import { describe, expect, it } from "vitest";
import { FocusManager, Focusable } from "../runtime/focus.js";

interface TestFocusable extends Focusable {
  label: string;
}

describe("FocusManager", () => {
  it("starts with nothing focused", () => {
    const fm = new FocusManager<TestFocusable>();
    expect(fm.getFocused()).toBeNull();
  });

  it("sets items and auto-focuses first", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focusIndex(0);
    expect(fm.getFocused()?.id).toBe("a");
  });

  it("next cycles forward", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focusIndex(0);
    fm.next();
    expect(fm.getFocused()?.id).toBe("b");
    fm.next();
    expect(fm.getFocused()?.id).toBe("a");
  });

  it("prev cycles backward", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focusIndex(1);
    fm.prev();
    expect(fm.getFocused()?.id).toBe("a");
  });

  it("handles Tab key event", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focusIndex(0);

    const tabEvent = { name: "tab" as const, input: "\t", ctrl: false, meta: false, alt: false, shift: false };
    expect(fm.handleEvent(tabEvent)).toBe(true);
    expect(fm.getFocused()?.id).toBe("b");
  });

  it("handles Shift+Tab", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focusIndex(0);

    const shiftTab = { name: "tab" as const, input: "\t", ctrl: false, meta: false, alt: false, shift: true };
    fm.handleEvent(shiftTab);
    expect(fm.getFocused()?.id).toBe("b");
  });

  it("focus by id", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "a", tabIndex: 0, label: "A" },
      { id: "b", tabIndex: 1, label: "B" },
    ]);
    fm.focus("b");
    expect(fm.isFocused("b")).toBe(true);
    expect(fm.isFocused("a")).toBe(false);
  });

  it("sorts items by tabIndex", () => {
    const fm = new FocusManager<TestFocusable>();
    fm.setItems([
      { id: "b", tabIndex: 10, label: "B" },
      { id: "a", tabIndex: 1, label: "A" },
    ]);
    fm.focusIndex(0);
    // First item after sorting by tabIndex should be "a"
    expect(fm.getFocused()?.id).toBe("a");
  });
});
