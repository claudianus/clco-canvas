import type { CellBuffer } from "../buffer/cell-buffer.js";
import type { KeyEvent, KeyName, Rgb } from "../types.js";
import { styleOpen, ANSI as ANSI_CODES } from "../terminal/ansi.js";

// ── Minimal XTerm.js interface (avoids hard dependency) ──────────────────────

export interface XTermTerminal {
  write(data: string | Uint8Array): void;
  resize(cols: number, rows: number): void;
  onData: { (listener: (data: string) => void): { dispose(): void } };
  onResize: { (listener: (size: { cols: number; rows: number }) => void): { dispose(): void } };
  onKey: { (listener: (event: { key: string; domEvent: KeyboardEvent }, data: string) => void): { dispose(): void } };
  options: { fontSize?: number; fontFamily?: string };
}

// ── Backend options ──────────────────────────────────────────────────────────

export interface XTermBackendOptions {
  /** XTerm.js Terminal instance */
  terminal: XTermTerminal;
  /** Initial columns (default 80) */
  columns?: number;
  /** Initial rows (default 24) */
  rows?: number;
  /** Enable true color (default true) */
  trueColor?: boolean;
  /** Capture keyboard input and emit KeyEvents */
  captureInput?: boolean;
  /** Forward mouse events (default true) */
  mouse?: boolean;
}

// ── XTerm.js backend ─────────────────────────────────────────────────────────

export class XTermBackend {
  readonly terminal: XTermTerminal;
  columns: number;
  rows: number;
  trueColor: boolean;

  private prev: CellBuffer | null = null;
  private inputCallback: ((event: KeyEvent) => void) | null = null;
  private disposables: Array<{ dispose(): void }> = [];
  private cursorVisible = false;

  constructor(options: XTermBackendOptions) {
    this.terminal = options.terminal;
    this.columns = options.columns ?? 80;
    this.rows = options.rows ?? 24;
    this.trueColor = options.trueColor ?? true;

    this.terminal.resize(this.columns, this.rows);

    this.disposables.push(
      this.terminal.onResize(({ cols, rows }) => {
        this.columns = cols;
        this.rows = rows;
        this.prev = null;
      }),
    );

    if (options.captureInput !== false) {
      this.attachInput();
    }

    if (options.mouse !== false) {
      this.terminal.write(ANSI_CODES.mouseOn);
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  /** Render a CellBuffer to the XTerm.js terminal */
  render(buffer: CellBuffer): void {
    const output = buffer.renderDiff(this.prev);
    this.prev = buffer.clone();
    if (output) {
      this.terminal.write(output);
    }
  }

  /** Full repaint (force re-render next frame) */
  invalidate(): void {
    this.prev = null;
  }

  // ── Cursor ───────────────────────────────────────────────────────────────

  showCursor(): void {
    if (!this.cursorVisible) {
      this.terminal.write(ANSI_CODES.showCursor);
      this.cursorVisible = true;
    }
  }

  hideCursor(): void {
    if (this.cursorVisible) {
      this.terminal.write(ANSI_CODES.hideCursor);
      this.cursorVisible = false;
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────

  onInput(callback: (event: KeyEvent) => void): void {
    this.inputCallback = callback;
  }

  private attachInput(): void {
    this.disposables.push(
      this.terminal.onKey((event, data) => {
        if (!this.inputCallback) return;
        const keyEvent = xtermKeyToKeyEvent(event, data);
        if (keyEvent) this.inputCallback(keyEvent);
      }),
    );

    this.disposables.push(
      this.terminal.onData((data) => {
        if (!this.inputCallback) return;
        // Only forward if onKey didn't handle it (raw data path)
        // onKey fires first, so this is for paste and other non-key input
        if (data.length === 0) return;
        const first = data[0];
        // Skip single chars already handled by onKey
        if (data.length === 1 && first >= " ") return;
        this.inputCallback({
          name: "paste",
          input: data,
          ctrl: false,
          meta: false,
          alt: false,
          shift: false,
        });
      }),
    );
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.hideCursor();
  }
}

// ── Key event mapping ────────────────────────────────────────────────────────

function xtermKeyToKeyEvent(
  event: { key: string; domEvent: KeyboardEvent },
  _data: string,
): KeyEvent | null {
  const { key, domEvent } = event;
  const ctrl = domEvent.ctrlKey;
  const meta = domEvent.metaKey || domEvent.altKey;
  const alt = domEvent.altKey && !domEvent.metaKey;
  const shift = domEvent.shiftKey;

  const name = mapKeyName(key, domEvent);
  if (!name) {
    if (key.length === 1) {
      return { name: "char", input: key, ctrl, meta, alt, shift };
    }
    return null;
  }

  // Prevent duplicate: if name matches a simple character, emit as char
  if (name === "char") {
    return { name: "char", input: key, ctrl, meta, alt, shift };
  }

  return { name, input: key, ctrl, meta, alt, shift };
}

function mapKeyName(key: string, domEvent: KeyboardEvent): KeyName | null {
  const code = domEvent.code;

  switch (code) {
    case "ArrowUp": return "up";
    case "ArrowDown": return "down";
    case "ArrowLeft": return "left";
    case "ArrowRight": return "right";
    case "Enter": return "enter";
    case "Escape": return "escape";
    case "Backspace": return "backspace";
    case "Delete": return "delete";
    case "Tab": return "tab";
    case "Space": return "space";
    case "Home": return "home";
    case "End": return "end";
    case "PageUp": return "pageUp";
    case "PageDown": return "pageDown";
    default:
      if (code.startsWith("F") && code.length <= 4) {
        const num = parseInt(code.slice(1), 10);
        if (num >= 1 && num <= 12) return `f${num}` as KeyName;
      }
      if (key.length === 1) return "char";
      return null;
  }
}

// ── Standalone render helper ─────────────────────────────────────────────────

/** Render a CellBuffer to an ANSI string (full or diff) */
export function renderToAnsi(buffer: CellBuffer, prev?: CellBuffer | null): string {
  return prev ? buffer.renderDiff(prev) : buffer.renderFull();
}

/** Write a full CellBuffer to an XTerm.js terminal (non-diff, convenience) */
export function writeFullFrame(terminal: XTermTerminal, buffer: CellBuffer): void {
  terminal.write(buffer.renderFull());
}
