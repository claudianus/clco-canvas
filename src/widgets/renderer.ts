import { CellBuffer } from "../buffer/cell-buffer.js";
import type { RenderContext } from "../runtime/navigator.js";
import { Widget } from "./widget.js";

// ── Widget tree renderer ─────────────────────────────────────────────────────

export interface WidgetRendererOptions {
  /** If true, clip children to parent rect (default true) */
  clipChildren?: boolean;
}

export class WidgetRenderer {
  private options: Required<WidgetRendererOptions>;

  constructor(options: WidgetRendererOptions = {}) {
    this.options = { clipChildren: options.clipChildren ?? true };
  }

  /** Render the full widget tree into a buffer */
  render(root: Widget<any>, ctx: RenderContext): CellBuffer {
    const buf = new CellBuffer(ctx.width, ctx.height);
    this.renderWidget(root, buf, ctx);
    return buf;
  }

  private renderWidget(widget: Widget<any>, buf: CellBuffer, ctx: RenderContext): void {
    if (!widget.visible) return;

    // Render self
    widget.render(buf, ctx);

    // Render children (back-to-front)
    for (const child of widget.children) {
      this.renderWidget(child, buf, ctx);
    }
  }

  /** Update entire tree with delta time */
  updateTree(root: Widget<any>, dt: number): void {
    root.walk((w) => {
      if (w.visible) w.update(dt);
    });
  }

  /** Find the deepest focusable widget at given coordinates */
  hitTest(root: Widget<any>, x: number, y: number): Widget<any> | null {
    for (let i = root.children.length - 1; i >= 0; i--) {
      const child = root.children[i];
      const hit = this.hitTest(child, x, y);
      if (hit) return hit;
    }
    const abs = root.absoluteRect();
    if (x >= abs.x && x < abs.x + abs.w && y >= abs.y && y < abs.y + abs.h) {
      return root.focusable ? root : null;
    }
    return null;
  }
}
