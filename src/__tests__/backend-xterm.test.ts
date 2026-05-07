import { describe, expect, it } from "vitest";
import { XTermBackend, renderToAnsi, writeFullFrame, XTermTerminal } from "../backend/xterm.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

// ── Mock XTerm.js terminal ───────────────────────────────────────────────────

function mockTerminal(): XTermTerminal & { output: string; fireResize(cols: number, rows: number): void } {
  let dataListener: ((data: string) => void) | null = null;
  let resizeListener: ((size: { cols: number; rows: number }) => void) | null = null;
  let keyListener: ((event: { key: string; domEvent: KeyboardEvent }, data: string) => void) | null = null;

  const term: XTermTerminal & { output: string; fireResize(cols: number, rows: number): void } = {
    output: "",
    fireResize(cols: number, rows: number) {
      if (resizeListener) resizeListener({ cols, rows });
    },
    write(data: string | Uint8Array) {
      term.output += typeof data === "string" ? data : new TextDecoder().decode(data);
    },
    resize(_cols: number, _rows: number) {},
    onData(listener: (data: string) => void) {
      dataListener = listener;
      return { dispose() { dataListener = null; } };
    },
    onResize(listener: (size: { cols: number; rows: number }) => void) {
      resizeListener = listener;
      return { dispose() { resizeListener = null; } };
    },
    onKey(listener: (event: { key: string; domEvent: KeyboardEvent }, data: string) => void) {
      keyListener = listener;
      return { dispose() { keyListener = null; } };
    },
    options: {},
  } as unknown as XTermTerminal & { output: string; fireResize(cols: number, rows: number): void };

  return term;
}

describe("XTermBackend", () => {
  it("creates backend with initial size", () => {
    const term = mockTerminal();
    const backend = new XTermBackend({ terminal: term, columns: 40, rows: 15 });
    expect(backend.columns).toBe(40);
    expect(backend.rows).toBe(15);
    backend.dispose();
  });

  it("renders CellBuffer to terminal", () => {
    const term = mockTerminal();
    const backend = new XTermBackend({ terminal: term, columns: 20, rows: 3, captureInput: false });

    const buf = new CellBuffer(20, 3);
    buf.write(0, 0, "Hello", {}, 20);
    backend.render(buf);

    expect(term.output).toContain("Hello");
    backend.dispose();
  });

  it("diff rendering skips unchanged areas", () => {
    const term = mockTerminal();
    const backend = new XTermBackend({ terminal: term, columns: 20, rows: 3, captureInput: false });

    const buf1 = new CellBuffer(20, 3);
    buf1.write(0, 0, "Frame 1", {}, 20);
    backend.render(buf1);
    const afterFirst = term.output.length;

    // Same content → no output
    const buf2 = new CellBuffer(20, 3);
    buf2.write(0, 0, "Frame 1", {}, 20);
    backend.render(buf2);
    expect(term.output.length).toBe(afterFirst);

    // Changed content → diff output
    const buf3 = new CellBuffer(20, 3);
    buf3.write(0, 0, "Frame 3", {}, 20);
    backend.render(buf3);
    expect(term.output.length).toBeGreaterThan(afterFirst);

    backend.dispose();
  });

  it("invalidate forces full render", () => {
    const term = mockTerminal();
    const backend = new XTermBackend({ terminal: term, columns: 20, rows: 3, captureInput: false });

    const buf = new CellBuffer(20, 3);
    buf.write(0, 0, "Test", {}, 20);
    backend.render(buf);
    const len = term.output.length;

    backend.invalidate();
    buf.write(0, 0, "Test", {}, 20);
    backend.render(buf);
    // Full render always produces output even if content is same
    expect(term.output.length).toBeGreaterThan(len);

    backend.dispose();
  });

  it("showCursor/hideCursor toggle", () => {
    const term = mockTerminal();
    const backend = new XTermBackend({ terminal: term, columns: 20, rows: 3, captureInput: false });

    backend.showCursor();
    expect(term.output).toContain("\x1b[?25h");

    backend.hideCursor();
    backend.dispose();
  });

  it("renderToAnsi produces ANSI string", () => {
    const buf = new CellBuffer(10, 2);
    buf.write(0, 0, "Test", {}, 10);
    const ansi = renderToAnsi(buf);
    expect(ansi).toContain("Test");
    expect(ansi).toContain("\x1b[");
  });

  it("writeFullFrame writes to terminal", () => {
    const term = mockTerminal();
    const buf = new CellBuffer(10, 2);
    buf.write(0, 0, "Full", {}, 10);
    writeFullFrame(term, buf);
    expect(term.output).toContain("Full");
  });
});
