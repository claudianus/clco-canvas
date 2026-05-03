import assert from "node:assert/strict";
import { CellBuffer, drawBox, drawText, displayWidth, truncateText } from "../dist/index.js";
import { tween } from "../dist/animation/easing.js";
import { solveFlex } from "../dist/layout/flex.js";
import { defaultTheme, toneStyle } from "../dist/style/theme.js";

assert.equal(displayWidth("모델"), 4);
assert.equal(truncateText("모델 라우터", 4), "모…");
assert.equal(Math.round(tween(0, 10, 0.5, "easeOutCubic")), 9);
assert.deepEqual(solveFlex(10, [{ basis: 2 }, { grow: 1, min: 1 }], 1), [2, 7]);
assert.equal(toneStyle(defaultTheme, "primary").fg?.[1], 214);

const buf = new CellBuffer(24, 5);
drawBox(buf, { x: 0, y: 0, w: 24, h: 5 }, "demo", { tone: "primary" });
drawText(buf, 2, 2, "clco-canvas", { tone: "success" }, 20);
assert.match(buf.toPlainString(), /clco-canvas/);

process.stdout.write("clco-canvas smoke ok\n");

