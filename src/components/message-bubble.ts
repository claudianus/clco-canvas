import type { Rect, Style, Tone } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { drawBox } from "../paint/primitives.js";
import { renderParagraph } from "../text/wrap.js";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface MessageBubbleState {
  role: MessageRole;
  content: string;
  header?: string;
  focused?: boolean;
}

const ROLE_TONE: Record<MessageRole, Tone> = {
  user: "primary",
  assistant: "success",
  system: "muted",
  tool: "warning",
};

const ROLE_LABEL: Record<MessageRole, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
};

export function drawMessageBubble(
  buf: CellBuffer,
  rect: Rect,
  state: MessageBubbleState,
  style: Style = {},
): void {
  const tone = ROLE_TONE[state.role];
  const label = state.header ?? ROLE_LABEL[state.role];

  const boxStyle: Style = {
    ...style,
    tone: state.focused ? "primary" : "muted",
  };
  drawBox(buf, rect, label, boxStyle, true);

  const inner = {
    x: rect.x + 2,
    y: rect.y + 1,
    w: Math.max(0, rect.w - 4),
    h: Math.max(0, rect.h - 2),
  };

  if (inner.w <= 0 || inner.h <= 0) return;

  // Role indicator gutter
  const gutter = state.role === "user" ? "▸" : "▹";
  buf.set(inner.x, inner.y, gutter, { tone, bold: true });

  const textX = inner.x + 2;
  const textW = Math.max(0, inner.w - 2);
  renderParagraph(buf, { x: textX, y: inner.y, w: textW, h: inner.h }, state.content, {
    tone,
    ...style,
  });
}
