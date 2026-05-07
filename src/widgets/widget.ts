import type { KeyEvent, Rect, Style } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import type { RenderContext } from "../runtime/navigator.js";

// ── Widget base class ────────────────────────────────────────────────────────

let nextId = 0;

export abstract class Widget<TState = void> {
  readonly id: string;
  rect: Rect;
  parent: Widget<any> | null = null;
  readonly children: Widget<any>[] = [];

  state: TState;
  style: Style = {};

  focusable = false;
  tabIndex = 0;
  isFocused = false;

  visible = true;

  constructor(id?: string) {
    this.id = id ?? `widget_${++nextId}`;
    this.rect = { x: 0, y: 0, w: 0, h: 0 };
    this.state = undefined as unknown as TState;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Called once after widget is added to tree */
  mount(): void {}

  /** Called each frame before render with delta time in ms */
  update(_dt: number): void {}

  /** Called each frame to paint into buffer */
  abstract render(buf: CellBuffer, ctx: RenderContext): void;

  /** Called when widget is removed from tree */
  unmount(): void {}

  // ── Event handling ──────────────────────────────────────────────────────

  /** Return true to stop propagation */
  handleEvent(_event: KeyEvent): boolean {
    return false;
  }

  /** Walk children and dispatch event. Override for custom routing. */
  dispatchEvent(event: KeyEvent): boolean {
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.visible && child.dispatchEvent(event)) return true;
    }
    return this.handleEvent(event);
  }

  // ── Tree management ─────────────────────────────────────────────────────

  addChild<C extends Widget<any>>(child: C): C {
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    this.children.push(child);
    child.mount();
    return child;
  }

  removeChild(child: Widget<any>): void {
    const idx = this.children.indexOf(child);
    if (idx < 0) return;
    child.unmount();
    child.parent = null;
    this.children.splice(idx, 1);
  }

  removeAllChildren(): void {
    for (const child of [...this.children]) {
      this.removeChild(child);
    }
  }

  findById(id: string): Widget<any> | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  /** Depth-first walk */
  walk(fn: (widget: Widget<any>) => void): void {
    fn(this);
    for (const child of this.children) {
      child.walk(fn);
    }
  }

  /** Collect all focusable widgets in tab order */
  getFocusable(): Widget<any>[] {
    const result: Widget<any>[] = [];
    this.walk((w) => {
      if (w.focusable && w.visible) result.push(w);
    });
    result.sort((a, b) => a.tabIndex - b.tabIndex);
    return result;
  }

  // ── State ───────────────────────────────────────────────────────────────

  setState(updater: (prev: TState) => TState): void {
    this.state = updater(this.state);
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  /** Clip buffer writes to this widget's rect */
  protected clipRect(): Rect {
    return { ...this.rect };
  }

  /** Bounds relative to root (0,0) */
  absoluteRect(): Rect {
    let x = this.rect.x;
    let y = this.rect.y;
    let p = this.parent;
    while (p) {
      x += p.rect.x;
      y += p.rect.y;
      p = p.parent;
    }
    return { x, y, w: this.rect.w, h: this.rect.h };
  }
}
