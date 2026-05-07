import { describe, expect, it } from "vitest";
import { drawStreamingText, streamingProgress } from "../components/streaming-text.js";
import { drawMessageBubble } from "../components/message-bubble.js";
import { drawTokenMeter, tokenWarning } from "../components/token-meter.js";
import { drawDiffView, parseUnifiedDiff, DiffLine } from "../components/diff-view.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

describe("StreamingText", () => {
  it("reveals text progressively", () => {
    const buf = new CellBuffer(20, 3);
    drawStreamingText(buf, 0, 0, 20, {
      text: "Hello World",
      revealed: 5,
      cursor: false,
      cursorVisible: false,
      speed: 1,
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("Hello");
    expect(plain).not.toContain("World");
  });

  it("shows full text when revealed >= length", () => {
    const buf = new CellBuffer(20, 3);
    drawStreamingText(buf, 0, 0, 20, {
      text: "Hi",
      revealed: 10,
      cursor: false,
      cursorVisible: false,
      speed: 1,
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("Hi");
  });

  it("shows cursor when enabled and visible", () => {
    const buf = new CellBuffer(20, 3);
    drawStreamingText(buf, 0, 0, 20, {
      text: "Hello",
      revealed: 5,
      cursor: true,
      cursorVisible: true,
      speed: 1,
    });
    // Should have the cursor character somewhere
    const plain = buf.toPlainString();
    expect(plain).toContain("▍");
  });

  it("hides cursor when not visible", () => {
    const buf = new CellBuffer(20, 3);
    drawStreamingText(buf, 0, 0, 20, {
      text: "Hello",
      revealed: 5,
      cursor: true,
      cursorVisible: false,
      speed: 1,
    });
    const plain = buf.toPlainString();
    expect(plain).not.toContain("▍");
  });

  it("streamingProgress computes ratio", () => {
    expect(streamingProgress(50, 100)).toBe(0.5);
    expect(streamingProgress(0, 100)).toBe(0);
    expect(streamingProgress(100, 0)).toBe(0);
    expect(streamingProgress(200, 100)).toBe(1);
  });
});

describe("MessageBubble", () => {
  it("draws user bubble", () => {
    const buf = new CellBuffer(30, 6);
    drawMessageBubble(buf, { x: 0, y: 0, w: 30, h: 6 }, {
      role: "user",
      content: "Hello assistant!",
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("You");
    expect(plain).toContain("Hello assistant!");
  });

  it("draws assistant bubble", () => {
    const buf = new CellBuffer(30, 6);
    drawMessageBubble(buf, { x: 0, y: 0, w: 30, h: 6 }, {
      role: "assistant",
      content: "How can I help?",
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("Assistant");
    expect(plain).toContain("How can I help?");
  });

  it("draws system bubble", () => {
    const buf = new CellBuffer(30, 6);
    drawMessageBubble(buf, { x: 0, y: 0, w: 30, h: 6 }, {
      role: "system",
      content: "Context loaded.",
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("System");
  });

  it("uses custom header", () => {
    const buf = new CellBuffer(30, 6);
    drawMessageBubble(buf, { x: 0, y: 0, w: 30, h: 6 }, {
      role: "user",
      content: "Test",
      header: "Custom",
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("Custom");
  });

  it("shows focused style", () => {
    const buf = new CellBuffer(30, 6);
    drawMessageBubble(buf, { x: 2, y: 1, w: 26, h: 5 }, {
      role: "assistant",
      content: "Focused message",
      focused: true,
    });
    // Should not throw
    expect(buf).toBeDefined();
  });
});

describe("TokenMeter", () => {
  it("draws context bar", () => {
    const buf = new CellBuffer(32, 6);
    drawTokenMeter(buf, { x: 0, y: 0, w: 32, h: 6 }, {
      context: { used: 50000, limit: 100000 },
      label: "claude-sonnet-4-6",
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("claude-sonnet-4-6");
    expect(plain).toContain("50,000");
    expect(plain).toContain("100,000");
  });

  it("shows danger tone when over 90%", () => {
    const buf = new CellBuffer(32, 6);
    drawTokenMeter(buf, { x: 0, y: 0, w: 32, h: 6 }, {
      context: { used: 95000, limit: 100000 },
    });
    // Should still render without error
    expect(buf).toBeDefined();
  });

  it("draws generation bar when provided", () => {
    const buf = new CellBuffer(32, 8);
    drawTokenMeter(buf, { x: 0, y: 0, w: 32, h: 8 }, {
      context: { used: 30000, limit: 100000 },
      generation: { used: 2000, limit: 8192 },
    });
    const plain = buf.toPlainString();
    expect(plain).toContain("2,000");
    expect(plain).toContain("8,192");
  });

  it("tokenWarning returns correct levels", () => {
    expect(tokenWarning(96000, 100000)).toBe("critical");
    expect(tokenWarning(80000, 100000)).toBe("warn");
    expect(tokenWarning(50000, 100000)).toBe("none");
    expect(tokenWarning(0, 0)).toBe("none");
  });
});

describe("DiffView", () => {
  it("draws diff lines", () => {
    const buf = new CellBuffer(40, 8);
    const lines: DiffLine[] = [
      { type: "header", content: "@@ -1,3 +1,4 @@" },
      { type: "context", content: "unchanged line", oldLine: 1, newLine: 1 },
      { type: "remove", content: "removed line", oldLine: 2 },
      { type: "add", content: "added line", newLine: 2 },
    ];
    drawDiffView(buf, { x: 0, y: 0, w: 40, h: 8 }, { lines, scroll: 0 });
    const plain = buf.toPlainString();
    expect(plain).toContain("unchanged line");
    expect(plain).toContain("removed line");
    expect(plain).toContain("added line");
  });

  it("respects scroll offset", () => {
    const buf = new CellBuffer(40, 3);
    const lines: DiffLine[] = [
      { type: "context", content: "line 0", oldLine: 1, newLine: 1 },
      { type: "context", content: "line 1", oldLine: 2, newLine: 2 },
      { type: "context", content: "line 2", oldLine: 3, newLine: 3 },
    ];
    drawDiffView(buf, { x: 0, y: 0, w: 40, h: 2 }, { lines, scroll: 1 });
    const plain = buf.toPlainString();
    expect(plain).not.toContain("line 0");
    expect(plain).toContain("line 1");
    expect(plain).toContain("line 2");
  });

  it("parseUnifiedDiff handles basic diff", () => {
    const diff = "@@ -1,2 +1,3 @@\n unchanged\n-removed\n+added";
    const lines = parseUnifiedDiff(diff);
    expect(lines).toHaveLength(4);
    expect(lines[0].type).toBe("header");
    expect(lines[1].type).toBe("context");
    expect(lines[2].type).toBe("remove");
    expect(lines[3].type).toBe("add");
  });

  it("parseUnifiedDiff tracks line numbers", () => {
    const diff = "@@ -10,5 +20,6 @@\n unchanged\n+added line";
    const lines = parseUnifiedDiff(diff);
    expect(lines[2].type).toBe("add");
    expect(lines[2].newLine).toBe(21);
  });

  it("handles empty diff", () => {
    const lines = parseUnifiedDiff("");
    expect(lines).toHaveLength(0);
  });
});
