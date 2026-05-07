import { describe, expect, it } from "vitest";
import { KeyParser, parseKeyEvents } from "../input/parser.js";

describe("KeyParser", () => {
  describe("basic keys", () => {
    it("parses enter", () => {
      const events = parseKeyEvents("\r");
      expect(events[0].name).toBe("enter");
    });
    it("parses escape", () => {
      const events = parseKeyEvents("\x1b");
      expect(events[0].name).toBe("escape");
    });
    it("parses tab", () => {
      const events = parseKeyEvents("\t");
      expect(events[0].name).toBe("tab");
    });
    it("parses backspace", () => {
      const events = parseKeyEvents("\x7f");
      expect(events[0].name).toBe("backspace");
    });
    it("parses space", () => {
      const events = parseKeyEvents(" ");
      expect(events[0].name).toBe("space");
    });
    it("parses Ctrl+C", () => {
      const events = parseKeyEvents("\x03");
      expect(events[0].ctrl).toBe(true);
      expect(events[0].input).toBe("c");
    });
    it("parses regular char", () => {
      const events = parseKeyEvents("a");
      expect(events[0].name).toBe("char");
      expect(events[0].input).toBe("a");
    });
  });

  describe("arrow keys", () => {
    it("parses up arrow", () => {
      const events = parseKeyEvents("\x1b[A");
      expect(events[0].name).toBe("up");
    });
    it("parses down arrow", () => {
      const events = parseKeyEvents("\x1b[B");
      expect(events[0].name).toBe("down");
    });
    it("parses right arrow", () => {
      const events = parseKeyEvents("\x1b[C");
      expect(events[0].name).toBe("right");
    });
    it("parses left arrow", () => {
      const events = parseKeyEvents("\x1b[D");
      expect(events[0].name).toBe("left");
    });
  });

  describe("new keys (Phase 0.3)", () => {
    it("parses Home", () => {
      const events = parseKeyEvents("\x1b[H");
      expect(events[0].name).toBe("home");
    });
    it("parses End", () => {
      const events = parseKeyEvents("\x1b[F");
      expect(events[0].name).toBe("end");
    });
    it("parses PageUp", () => {
      const events = parseKeyEvents("\x1b[5~");
      expect(events[0].name).toBe("pageUp");
    });
    it("parses PageDown", () => {
      const events = parseKeyEvents("\x1b[6~");
      expect(events[0].name).toBe("pageDown");
    });
    it("parses Delete", () => {
      const events = parseKeyEvents("\x1b[3~");
      expect(events[0].name).toBe("delete");
    });
    it("parses Shift+Tab", () => {
      const events = parseKeyEvents("\x1b[Z");
      expect(events[0].name).toBe("tab");
      expect(events[0].shift).toBe(true);
    });
    it("parses F1 (O-format)", () => {
      const events = parseKeyEvents("\x1bOP");
      expect(events[0].name).toBe("f1");
    });
    it("parses F2 (O-format)", () => {
      const events = parseKeyEvents("\x1bOQ");
      expect(events[0].name).toBe("f2");
    });
    it("parses F5 (CSI format)", () => {
      const events = parseKeyEvents("\x1b[15~");
      expect(events[0].name).toBe("f5");
    });
    it("parses F12 (CSI format)", () => {
      const events = parseKeyEvents("\x1b[24~");
      expect(events[0].name).toBe("f12");
    });
    it("parses Ctrl+Up", () => {
      const events = parseKeyEvents("\x1b[1;5A");
      expect(events[0].name).toBe("up");
      expect(events[0].ctrl).toBe(true);
    });
    it("parses Ctrl+Shift+Down", () => {
      const events = parseKeyEvents("\x1b[1;6B");
      expect(events[0].name).toBe("down");
      expect(events[0].ctrl).toBe(true);
      expect(events[0].shift).toBe(true);
    });
    it("parses Alt+Left", () => {
      const events = parseKeyEvents("\x1b[1;3D");
      expect(events[0].name).toBe("left");
      expect(events[0].alt).toBe(true);
    });
  });

  describe("mouse events", () => {
    it("parses mouse down", () => {
      const events = parseKeyEvents("\x1b[<0;10;20M");
      expect(events[0].name).toBe("mouse");
      expect(events[0].mouse?.type).toBe("down");
      expect(events[0].mouse?.x).toBe(9);
      expect(events[0].mouse?.y).toBe(19);
    });
    it("parses scroll up", () => {
      const events = parseKeyEvents("\x1b[<64;10;20M");
      expect(events[0].name).toBe("mouse");
      expect(events[0].mouse?.type).toBe("scroll");
      expect(events[0].mouse?.scrollDirection).toBe("up");
    });
    it("parses scroll down", () => {
      const events = parseKeyEvents("\x1b[<65;10;20M");
      expect(events[0].name).toBe("mouse");
      expect(events[0].mouse?.type).toBe("scroll");
      expect(events[0].mouse?.scrollDirection).toBe("down");
    });
  });

  describe("paste", () => {
    it("parses bracketed paste", () => {
      const events = parseKeyEvents("\x1b[200~pasted text\x1b[201~");
      expect(events[0].name).toBe("paste");
      expect(events[0].input).toBe("pasted text");
    });
  });

  describe("KeyParser streaming", () => {
    it("buffers incomplete sequences", () => {
      const parser = new KeyParser();
      const events1 = parser.parse("\x1b[");
      expect(events1).toHaveLength(0);
      expect(parser.hasPending()).toBe(true);
      const events2 = parser.parse("A");
      expect(events2).toHaveLength(1);
      expect(events2[0].name).toBe("up");
      expect(parser.hasPending()).toBe(false);
    });

    it("flushes pending escape as standalone", () => {
      const parser = new KeyParser();
      parser.parse("\x1b");
      const events = parser.flush();
      expect(events[0].name).toBe("escape");
    });
  });

  describe("KeyEvent fields", () => {
    it("includes alt field", () => {
      const events = parseKeyEvents("a");
      expect(events[0]).toHaveProperty("alt");
      expect(events[0].alt).toBe(false);
    });
    it("defaults all modifier fields to false", () => {
      const events = parseKeyEvents("x");
      expect(events[0].ctrl).toBe(false);
      expect(events[0].meta).toBe(false);
      expect(events[0].alt).toBe(false);
      expect(events[0].shift).toBe(false);
    });
  });
});
