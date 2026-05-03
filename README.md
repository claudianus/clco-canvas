# clco-canvas

`clco-canvas` is a high-density TypeScript terminal UI canvas extracted from `clco-helper`.

It is currently alpha-quality: the low-level canvas, input, text, and paint APIs are usable, while higher-level component, theme, and animation APIs are still stabilizing.

- CJK-aware text measurement and truncation.
- Cell-buffer rendering with ANSI diff output.
- Raw keyboard and paste parsing.
- Terminal session helpers.
- Paint primitives for dense CLI dashboards.
- Future animation, theme, layout, component, and browser-inspector APIs.

## Status

Current version: `0.1.0-alpha.0`.

Expect API movement before `1.0.0`.

## Local Development

```bash
npm install
npm run typecheck
npm test
```

## Tiny Example

```ts
import { CellBuffer, drawBox, drawText, runSession } from "clco-canvas";

await runSession({
  alternateScreen: true,
  initialState: { selected: 0 },
  render(_state, ctx) {
    const buf = new CellBuffer(ctx.width, ctx.height);
    drawBox(buf, { x: 0, y: 0, w: ctx.width, h: ctx.height }, "demo", { tone: "primary" });
    drawText(buf, 2, 2, "Hello from clco-canvas", { tone: "success", bold: true });
    return buf;
  },
  handle(_state, event, controls) {
    if (event.name === "escape" || event.ctrl && event.input === "c") controls.resolve(undefined);
  },
});
```

## Design Direction

`clco-canvas` follows a few hard rules:

- Idle screens do no work.
- Animated screens target 60FPS and must degrade cleanly.
- CJK width, paste handling, and partial escape sequences are first-class.
- Components should be dense, keyboard-native, themeable, and testable through screenshots.

The broader roadmap lives in `docs/clco-canvas-open-source-plan.md` in the clco-helper repository.
