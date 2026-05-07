import { describe, expect, it } from "vitest";
import { Widget } from "../widgets/widget.js";
import { WidgetRenderer } from "../widgets/renderer.js";
import { CellBuffer } from "../buffer/cell-buffer.js";
import type { RenderContext, MotionProfile } from "../index.js";

// ── Test widgets ─────────────────────────────────────────────────────────────

interface LabelState {
  label: string;
}

class LabelWidget extends Widget<LabelState> {
  constructor(id: string, label: string) {
    super(id);
    this.state = { label };
  }

  render(buf: CellBuffer, _ctx: RenderContext): void {
    buf.write(this.rect.x, this.rect.y, this.state.label, {}, this.rect.w);
  }
}

class ButtonWidget extends Widget<{ label: string; pressed: boolean }> {
  focusable = true;

  constructor(id: string, label: string) {
    super(id);
    this.state = { label, pressed: false };
  }

  handleEvent(event: import("../types.js").KeyEvent): boolean {
    if (event.name === "enter") {
      this.setState((s) => ({ ...s, pressed: true }));
      return true;
    }
    return false;
  }

  render(buf: CellBuffer, _ctx: RenderContext): void {
    const prefix = this.isFocused ? "▶ " : "  ";
    const suffix = this.state.pressed ? " [OK]" : "";
    buf.write(this.rect.x, this.rect.y, prefix + this.state.label + suffix, { bold: this.isFocused }, this.rect.w);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

const ctx: RenderContext = {
  width: 80,
  height: 24,
  trueColor: false,
  frame: 0,
  now: Date.now(),
  motion: { ambient: false, durationMs: 300 } as MotionProfile,
};

describe("Widget", () => {
  it("assigns auto id", () => {
    const w = new (class extends Widget<void> {
      render(_buf: CellBuffer, _ctx: RenderContext) {}
    })();
    expect(w.id).toMatch(/^widget_\d+$/);
  });

  it("accepts custom id", () => {
    const w = new (class extends Widget<void> {
      render(_buf: CellBuffer, _ctx: RenderContext) {}
    })("custom");
    expect(w.id).toBe("custom");
  });

  it("adds and removes children", () => {
    const parent = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("parent");
    const child = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("child");

    parent.addChild(child);
    expect(parent.children).toHaveLength(1);
    expect(child.parent).toBe(parent);

    parent.removeChild(child);
    expect(parent.children).toHaveLength(0);
    expect(child.parent).toBeNull();
  });

  it("reparents child when moved", () => {
    const a = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("a");
    const b = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("b");
    const child = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("c");

    a.addChild(child);
    b.addChild(child);
    expect(a.children).toHaveLength(0);
    expect(b.children).toHaveLength(1);
    expect(child.parent).toBe(b);
  });

  it("findById walks tree", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const child = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("child");
    const grandchild = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("grandchild");

    root.addChild(child);
    child.addChild(grandchild);

    expect(root.findById("root")).toBe(root);
    expect(root.findById("grandchild")).toBe(grandchild);
    expect(root.findById("missing")).toBeNull();
  });

  it("removeAllChildren clears tree", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    root.addChild(new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("a"));
    root.addChild(new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("b"));
    root.removeAllChildren();
    expect(root.children).toHaveLength(0);
  });

  it("getFocusable collects and sorts by tabIndex", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const b1 = new ButtonWidget("b1", "First");
    b1.tabIndex = 10;
    const b2 = new ButtonWidget("b2", "Second");
    b2.tabIndex = 1;
    root.addChild(b1);
    root.addChild(b2);

    const focusable = root.getFocusable();
    expect(focusable).toHaveLength(2);
    expect(focusable[0].id).toBe("b2"); // lower tabIndex first
    expect(focusable[1].id).toBe("b1");
  });

  it("hidden widgets excluded from focusable", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const b = new ButtonWidget("b", "Hidden");
    b.visible = false;
    root.addChild(b);
    expect(root.getFocusable()).toHaveLength(0);
  });

  it("absoluteRect computes root-relative position", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    root.rect = { x: 0, y: 0, w: 80, h: 24 };
    const child = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("child");
    child.rect = { x: 10, y: 5, w: 20, h: 3 };
    root.addChild(child);

    const abs = child.absoluteRect();
    expect(abs.x).toBe(10);
    expect(abs.y).toBe(5);
  });

  it("mount/unmount lifecycle called", () => {
    let mounted = false;
    let unmounted = false;

    class LifecycleWidget extends Widget<void> {
      mount() { mounted = true; }
      unmount() { unmounted = true; }
      render(_buf: CellBuffer, _ctx: RenderContext) {}
    }

    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const child = new LifecycleWidget("lifecycle");
    root.addChild(child);
    expect(mounted).toBe(true);

    root.removeChild(child);
    expect(unmounted).toBe(true);
  });

  it("event dispatch walks children in reverse", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const b = new ButtonWidget("btn", "Press");
    root.addChild(b);

    const consumed = root.dispatchEvent({ name: "enter", input: "\r", ctrl: false, meta: false, alt: false, shift: false });
    expect(consumed).toBe(true);
    expect(b.state.pressed).toBe(true);
  });

  it("event propagation stops when consumed", () => {
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const b1 = new ButtonWidget("b1", "First");
    const b2 = new ButtonWidget("b2", "Second");
    root.addChild(b1);
    root.addChild(b2); // b2 is last child, gets first chance

    root.dispatchEvent({ name: "enter", input: "\r", ctrl: false, meta: false, alt: false, shift: false });
    expect(b2.state.pressed).toBe(true);
    expect(b1.state.pressed).toBe(false); // event consumed by b2
  });

  it("setState updates state", () => {
    const w = new LabelWidget("lbl", "Hello");
    w.setState(() => ({ label: "World" }));
    expect(w.state.label).toBe("World");
  });
});

describe("WidgetRenderer", () => {
  it("renders widget tree into buffer", () => {
    const renderer = new WidgetRenderer();
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const label = new LabelWidget("label", "Rendered");
    label.rect = { x: 0, y: 0, w: 20, h: 1 };
    root.addChild(label);

    const buf = renderer.render(root, ctx);
    expect(buf.toPlainString()).toContain("Rendered");
  });

  it("skips invisible widgets", () => {
    const renderer = new WidgetRenderer();
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    const label = new LabelWidget("label", "Hidden");
    label.visible = false;
    root.addChild(label);

    const buf = renderer.render(root, ctx);
    expect(buf.toPlainString()).not.toContain("Hidden");
  });

  it("updateTree calls update on all widgets", () => {
    const renderer = new WidgetRenderer();
    let updated = 0;
    class UpdatingWidget extends Widget<void> {
      update(_dt: number) { updated++; }
      render(_buf: CellBuffer, _ctx: RenderContext) {}
    }

    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    root.addChild(new UpdatingWidget("a"));
    root.addChild(new UpdatingWidget("b"));

    renderer.updateTree(root, 16);
    expect(updated).toBe(2);
  });

  it("hitTest finds widget at coordinates", () => {
    const renderer = new WidgetRenderer();
    const root = new (class extends Widget<void> { render(_buf: CellBuffer, _ctx: RenderContext) {} })("root");
    root.rect = { x: 0, y: 0, w: 80, h: 24 };

    const btn = new ButtonWidget("btn", "Click");
    btn.rect = { x: 10, y: 5, w: 12, h: 3 };
    root.addChild(btn);

    expect(renderer.hitTest(root, 15, 6)?.id).toBe("btn");
    expect(renderer.hitTest(root, 0, 0)).toBeNull();
  });
});
