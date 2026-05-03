import { EventEmitter } from "node:events";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import type { CapabilityProfile, KeyEvent } from "../types.js";
import { ANSI } from "./ansi.js";
import { KeyParser } from "../input/parser.js";

export interface SessionRenderContext {
  width: number;
  height: number;
  capabilities: CapabilityProfile;
  frame: number;
  now: number;
}

export interface SessionOptions<T> {
  title?: string;
  alternateScreen?: boolean;
  mouse?: boolean;
  initialState: T;
  animationIntervalMs?: number;
  escapeTimeoutMs?: number;
  render: (state: T, ctx: SessionRenderContext) => CellBuffer;
  handle: (state: T, event: KeyEvent, controls: SessionControls<T>) => void;
}

export interface SessionControls<T> {
  setState: (updater: (state: T) => T) => void;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  render: () => void;
}

export class TuiCancelled extends Error {
  constructor(message = "Cancelled") {
    super(message);
    this.name = "TuiCancelled";
  }
}

export function getCapabilities(): CapabilityProfile {
  const stdout = process.stdout;
  const term = process.env.TERM ?? "";
  const colorDepth = typeof stdout.getColorDepth === "function" ? stdout.getColorDepth() : 1;
  const legacy = !stdout.isTTY || term === "dumb";
  return {
    isTty: Boolean(stdout.isTTY && process.stdin.isTTY),
    columns: stdout.columns || 80,
    rows: stdout.rows || 24,
    colorDepth,
    trueColor: colorDepth >= 24 || process.env.COLORTERM === "truecolor",
    unicode: process.platform !== "win32" || process.env.WT_SESSION !== undefined || process.env.TERM_PROGRAM !== undefined,
    alternateScreen: !legacy,
    bracketedPaste: !legacy,
    mouse: !legacy,
    legacy,
  };
}

export function runSession<T, R>(options: SessionOptions<T>): Promise<R> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.reject(new TuiCancelled("Interactive terminal required"));
  }

  const capabilities = getCapabilities();
  let state = options.initialState;
  let previous: CellBuffer | null = null;
  let settled = false;
  let writing = false;
  let pendingRender = false;
  let frame = 0;
  let animationTimer: ReturnType<typeof setInterval> | null = null;
  let pendingInputTimer: ReturnType<typeof setTimeout> | null = null;
  const keyParser = new KeyParser();
  const escapeTimeoutMs = Math.max(80, options.escapeTimeoutMs ?? 150);

  const cleanup = (): void => {
    if (animationTimer) {
      clearInterval(animationTimer);
      animationTimer = null;
    }
    if (pendingInputTimer) {
      clearTimeout(pendingInputTimer);
      pendingInputTimer = null;
    }
    process.stdin.off("data", onData);
    process.stdout.off("resize", onResize);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    if (capabilities.bracketedPaste) process.stdout.write(ANSI.bracketedPasteOff);
    if (options.mouse && capabilities.mouse) process.stdout.write(ANSI.mouseOff);
    if (options.alternateScreen !== false && capabilities.alternateScreen) process.stdout.write(ANSI.altOff);
    process.stdout.write(ANSI.showCursor + ANSI.reset);
  };

  const renderNow = (): void => {
    if (settled) return;
    if (writing) {
      pendingRender = true;
      return;
    }
    writing = true;
    const width = process.stdout.columns || capabilities.columns || 80;
    const height = process.stdout.rows || capabilities.rows || 24;
    const next = options.render(state, {
      width,
      height,
      frame,
      now: Date.now(),
      capabilities: { ...capabilities, columns: width, rows: height },
    });
    const output = next.renderDiff(previous);
    previous = next.clone();
    if (output.length === 0) {
      finishWrite();
      return;
    }
    if (process.stdout.write(output)) {
      finishWrite();
      return;
    }
    process.stdout.once("drain", finishWrite);
  };

  const finishWrite = (): void => {
    writing = false;
    if (!pendingRender || settled) return;
    pendingRender = false;
    renderNow();
  };

  const controls: SessionControls<T> = {
    setState(updater) {
      state = updater(state);
      renderNow();
    },
    resolve(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolveOuter(value as R);
    },
    reject(err) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectOuter(err);
    },
    render: renderNow,
  };

  function dispatchEvents(events: KeyEvent[]): void {
    for (const event of events) {
      if (event.ctrl && event.input === "c") {
        controls.reject(new TuiCancelled());
        return;
      }
      options.handle(state, event, controls);
      if (settled) return;
    }
  }

  function flushPendingInput(): void {
    pendingInputTimer = null;
    dispatchEvents(keyParser.flush());
  }

  function onData(chunk: Buffer): void {
    if (pendingInputTimer) {
      clearTimeout(pendingInputTimer);
      pendingInputTimer = null;
    }
    dispatchEvents(keyParser.parse(chunk));
    if (settled || !keyParser.hasPending()) return;
    if (keyParser.pendingKind() === "escape") {
      pendingInputTimer = setTimeout(flushPendingInput, escapeTimeoutMs);
      pendingInputTimer.unref();
    }
  }

  function onResize(): void {
    previous = null;
    renderNow();
  }

  let resolveOuter!: (value: R) => void;
  let rejectOuter!: (err: Error) => void;
  const promise = new Promise<R>((resolve, reject) => {
    resolveOuter = resolve;
    rejectOuter = reject;
  });

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", onData);
  process.stdout.on("resize", onResize);
  if (options.alternateScreen !== false && capabilities.alternateScreen) process.stdout.write(ANSI.altOn);
  if (capabilities.bracketedPaste) process.stdout.write(ANSI.bracketedPasteOn);
  if (options.mouse && capabilities.mouse) process.stdout.write(ANSI.mouseOn);
  process.stdout.write(ANSI.hideCursor + ANSI.clear);
  renderNow();
  if (options.animationIntervalMs && options.animationIntervalMs > 0) {
    animationTimer = setInterval(() => {
      frame += 1;
      renderNow();
    }, Math.max(33, options.animationIntervalMs));
    animationTimer.unref();
  }

  return promise;
}

export function onceFrame(): Promise<void> {
  const emitter = new EventEmitter();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      emitter.emit("frame");
      resolve();
    }, 33);
    timer.unref();
  });
}
