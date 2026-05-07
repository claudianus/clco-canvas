import { describe, expect, it } from "vitest";
import { CellBuffer } from "../buffer/cell-buffer.js";
import { drawButton } from "../components/button.js";
import { drawTextInput } from "../components/text-input.js";
import { drawTabs, TabDef } from "../components/tabs.js";
import { drawSpinner, spinnerFrame } from "../components/spinner.js";
import { drawProgressBar } from "../components/progress-bar.js";
import { drawDialog } from "../components/dialog.js";
import { drawList } from "../components/list.js";

describe("Button", () => {
  it("draws a button with label", () => {
    const buf = new CellBuffer(20, 3);
    drawButton(buf, { x: 2, y: 0, w: 12, h: 3 }, { label: "OK", focused: false, pressed: false });
    const plain = buf.toPlainString();
    expect(plain).toContain("OK");
  });

  it("draws focused button with indicator", () => {
    const buf = new CellBuffer(20, 3);
    drawButton(buf, { x: 2, y: 0, w: 12, h: 3 }, { label: "OK", focused: true, pressed: false });
    // Should have the focus indicator
    expect(buf.get(2, 0).ch).toBe("▐");
  });
});

describe("TextInput", () => {
  it("draws an empty text input", () => {
    const buf = new CellBuffer(20, 3);
    drawTextInput(buf, { x: 2, y: 0, w: 14, h: 3 }, { value: "", cursor: 0, focused: true });
    // Should not throw
    expect(buf).toBeDefined();
  });

  it("shows placeholder when empty and unfocused", () => {
    const buf = new CellBuffer(20, 3);
    drawTextInput(
      buf,
      { x: 2, y: 0, w: 14, h: 3 },
      { value: "", cursor: 0, focused: false, placeholder: "Type..." },
    );
    const plain = buf.toPlainString();
    expect(plain).toContain("Type...");
  });
});

describe("Tabs", () => {
  it("draws tabs", () => {
    const buf = new CellBuffer(40, 4);
    const tabs: TabDef[] = [
      { id: "a", label: "Tab A" },
      { id: "b", label: "Tab B" },
    ];
    drawTabs(buf, { x: 2, y: 0, w: 36, h: 3 }, { tabs, active: 0 });
    const plain = buf.toPlainString();
    expect(plain).toContain("Tab A");
    expect(plain).toContain("Tab B");
  });

  it("handles empty tabs", () => {
    const buf = new CellBuffer(20, 3);
    drawTabs(buf, { x: 0, y: 0, w: 10, h: 3 }, { tabs: [], active: 0 });
    // Should not throw
  });
});

describe("Spinner", () => {
  it("draws spinner glyph", () => {
    const buf = new CellBuffer(10, 3);
    drawSpinner(buf, 2, 1, { frame: 0, message: "Loading" });
    expect(buf.get(2, 1).ch).toBe("⠋");
  });

  it("returns different glyphs for different frames", () => {
    const frame0 = spinnerFrame(0);
    const frame1 = spinnerFrame(80);
    expect(frame0).not.toBe(frame1);
  });
});

describe("ProgressBar", () => {
  it("draws progress bar", () => {
    const buf = new CellBuffer(20, 3);
    drawProgressBar(buf, { x: 2, y: 1, w: 16, h: 1 }, { value: 0.5, label: "50%" });
    // Should have filled and empty sections
    expect(buf.get(2, 1).ch).toBe("█");
  });

  it("handles 0% progress", () => {
    const buf = new CellBuffer(20, 3);
    drawProgressBar(buf, { x: 0, y: 0, w: 10, h: 1 }, { value: 0 });
    expect(buf.get(0, 0).ch).toBe("░");
  });
});

describe("Dialog", () => {
  it("draws a dialog with title", () => {
    const buf = new CellBuffer(30, 10);
    drawDialog(buf, { x: 2, y: 1, w: 26, h: 8 }, { title: "Confirm", message: "Are you sure?" });
    const plain = buf.toPlainString();
    expect(plain).toContain("Confirm");
  });

  it("draws buttons", () => {
    const buf = new CellBuffer(30, 10);
    drawDialog(
      buf,
      { x: 2, y: 1, w: 26, h: 8 },
      { title: "Confirm", message: "Proceed?", buttons: ["Yes", "No"], focusedButton: 0 },
    );
    const plain = buf.toPlainString();
    expect(plain).toContain("Yes");
    expect(plain).toContain("No");
  });
});

describe("List", () => {
  it("draws list items", () => {
    const buf = new CellBuffer(20, 10);
    drawList(buf, { x: 2, y: 1, w: 16, h: 5 }, { items: ["One", "Two", "Three"], selected: 0, scroll: 0, focused: true });
    const plain = buf.toPlainString();
    expect(plain).toContain("One");
    expect(plain).toContain("Two");
  });

  it("scrolls past first item", () => {
    const buf = new CellBuffer(20, 10);
    drawList(
      buf,
      { x: 0, y: 0, w: 10, h: 3 },
      { items: ["A", "B", "C", "D", "E"], selected: 0, scroll: 2, focused: false },
    );
    // Should only show items from index 2
    const plain = buf.toPlainString();
    expect(plain).not.toContain("A");
    expect(plain).toContain("C");
  });
});
