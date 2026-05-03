import type { KeyEvent, SceneNode } from "../types.js";

export type ScreenResult =
  | { type: "stay" }
  | { type: "push"; id: string }
  | { type: "pop" }
  | { type: "overlay"; id: string }
  | { type: "command"; id: string }
  | { type: "exit" };

export interface ScreenContext {
  width: number;
  height: number;
}

export interface Screen {
  id: string;
  render(ctx: ScreenContext): SceneNode;
  handle(event: KeyEvent, ctx: ScreenContext): ScreenResult;
}

export const stay: ScreenResult = { type: "stay" };
export const exit: ScreenResult = { type: "exit" };
