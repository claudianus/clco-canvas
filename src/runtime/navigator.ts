import type { KeyEvent, Rgb } from "../types.js";
import type { MotionProfile } from "../animation/motion.js";
import { CellBuffer } from "../buffer/cell-buffer.js";
import { blendTransition, normalizeTransitionEffect, type TransitionEffect } from "../transition/index.js";
import type { SessionControls } from "../terminal/session.js";

// ── Render context ────────────────────────────────────────────────────────

export interface RenderContext {
  width: number;
  height: number;
  trueColor: boolean;
  frame: number;
  now: number;
  motion: MotionProfile;
}

// ── Screen definition ─────────────────────────────────────────────────────

export type ScreenResult =
  | { type: "stay" }
  | { type: "navigate"; target: string }
  | { type: "back" }
  | { type: "exit"; action: string; payload?: string };

export interface ScreenControls<TApp> {
  setAppState: (updater: (state: TApp) => TApp) => void;
  updateScreenState: <TScreen>(updater: (state: TScreen) => TScreen) => void;
  scheduleAction: (fn: (controls: SessionControls<TApp>) => Promise<void>) => void;
}

export interface ScreenDef<TApp = unknown, TScreenState = unknown> {
  id: string;
  enter?: (app: TApp) => { state: TScreenState; options?: unknown[] };
  init?: (controls: SessionControls<TApp>) => Promise<void>;
  render: (buf: CellBuffer, screenState: TScreenState, app: TApp, ctx: RenderContext) => void;
  handle: (screenState: TScreenState, app: TApp, event: KeyEvent, controls: ScreenControls<TApp>) => ScreenResult;
  shouldAnimate?: (screenState: TScreenState, app: TApp, now: number, motion: MotionProfile) => boolean;
}

// ── State shape required by the navigator ─────────────────────────────────

export interface TransitionState {
  type: "push" | "pop" | "entrance";
  from: string;
  to: string;
  direction: -1 | 1;
  startedAt: number;
}

export interface NavigableState {
  currentScreen: string;
  screenStates: Record<string, unknown>;
  transition: TransitionState | null;
  navStack: string[];
  exitStartedAt: number;
  extras: Record<string, unknown>;
}

// ── Navigator options ─────────────────────────────────────────────────────

export interface NavigatorOptions {
  /** Duration of push/pop transition in ms (default 420). */
  transitionMs?: number;
  /** Duration of exit animation in ms (default 850). */
  exitAnimationMs?: number;
  /** Max navigation stack depth (default 5). */
  maxNavDepth?: number;
  /** Called during exit to draw the VFX overlay. */
  onExitAnimation?: (buf: CellBuffer, state: NavigableState, ctx: RenderContext, progress: number) => void;
}

// ── Screen navigator ──────────────────────────────────────────────────────

export class ScreenNavigator<TApp extends NavigableState> {
  private screens = new Map<string, ScreenDef<TApp, any>>();
  private options: Required<NavigatorOptions>;

  constructor(options: NavigatorOptions = {}) {
    this.options = {
      transitionMs: options.transitionMs ?? 420,
      exitAnimationMs: options.exitAnimationMs ?? 850,
      maxNavDepth: options.maxNavDepth ?? 5,
      onExitAnimation: options.onExitAnimation ?? (() => {}),
    };
  }

  register<TScreen>(def: ScreenDef<TApp, TScreen>): void {
    this.screens.set(def.id, def);
  }

  getScreen(id: string): ScreenDef<TApp, any> | undefined {
    return this.screens.get(id);
  }

  // ── Rendering ─────────────────────────────────────────────────────────

  renderApp(state: TApp, ctx: RenderContext): CellBuffer {
    const buf = new CellBuffer(ctx.width, ctx.height);

    // Blend push/pop transitions
    if (state.transition && (state.transition.type === "push" || state.transition.type === "pop")) {
      this.renderTransition(buf, state, ctx);
      return buf;
    }

    // Exit animation
    if (state.exitStartedAt > 0) {
      this.renderExitAnimation(buf, state, ctx);
      return buf;
    }

    // Normal render
    const screen = this.screens.get(state.currentScreen);
    if (screen) {
      const screenState = state.screenStates[state.currentScreen];
      screen.render(buf, screenState, state, ctx);
    }

    return buf;
  }

  private renderTransition(buf: CellBuffer, state: TApp, ctx: RenderContext): void {
    if (!state.transition) return;
    const { from, to, direction, startedAt } = state.transition;
    const elapsed = ctx.now - startedAt;
    const progress = Math.min(1, elapsed / this.options.transitionMs);

    const fromScreen = this.screens.get(from);
    const toScreen = this.screens.get(to);
    if (!fromScreen || !toScreen) return;

    const fromBuf = new CellBuffer(ctx.width, ctx.height);
    const toBuf = new CellBuffer(ctx.width, ctx.height);

    const fromState = state.screenStates[from];
    const toState = state.screenStates[to];

    const tmpFrom: TApp = { ...state, currentScreen: from, transition: null };
    const tmpTo: TApp = { ...state, currentScreen: to, transition: null };

    fromScreen.render(fromBuf, fromState, tmpFrom, ctx);
    toScreen.render(toBuf, toState, tmpTo, ctx);

    const accent: Rgb = [0, 214, 255]; // default primary
    const effectName = state.extras["transitionEffect"] as string | undefined;
    const effect = normalizeTransitionEffect(effectName);
    const blended = blendTransition(effect, { target: toBuf, source: fromBuf, progress, direction, accent });

    for (let y = 0; y < ctx.height; y++) {
      for (let x = 0; x < ctx.width; x++) {
        const cell = blended.get(x, y);
        buf.set(x, y, cell.ch, cell.style);
      }
    }
  }

  private renderExitAnimation(buf: CellBuffer, state: TApp, ctx: RenderContext): void {
    const elapsed = ctx.now - state.exitStartedAt;
    const duration = this.options.exitAnimationMs;
    const progress = Math.min(1, elapsed / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const screen = this.screens.get(state.currentScreen);
    if (screen) {
      const screenState = state.screenStates[state.currentScreen];
      screen.render(buf, screenState, state, ctx);
      this.options.onExitAnimation(buf, state, ctx, eased);

      if (ctx.trueColor) {
        const fadeStart = 0.3;
        const fadeProgress = Math.max(0, Math.min(1, (eased - fadeStart) / (1 - fadeStart)));
        const brightness = 1 - fadeProgress;
        for (let y = 0; y < ctx.height; y++) {
          for (let x = 0; x < ctx.width; x++) {
            const cell = buf.get(x, y);
            if (cell.ch === "" || cell.ch === " ") continue;
            const fg = cell.style.fg
              ? [Math.round(cell.style.fg[0] * brightness), Math.round(cell.style.fg[1] * brightness), Math.round(cell.style.fg[2] * brightness)] as Rgb
              : undefined;
            const bg = cell.style.bg
              ? [Math.round(cell.style.bg[0] * brightness), Math.round(cell.style.bg[1] * brightness), Math.round(cell.style.bg[2] * brightness)] as Rgb
              : undefined;
            buf.set(x, y, fg || bg ? cell.ch : "", { ...cell.style, fg, bg });
          }
        }
      }
    }
  }

  // ── Event handling ──────────────────────────────────────────────────────

  handleEvent(
    state: TApp,
    event: KeyEvent,
    sessionControls: SessionControls<TApp>,
    getScreenControls: (state: TApp, screenId: string) => ScreenControls<TApp>,
    scheduleAction: (fn: (c: SessionControls<TApp>) => Promise<void>) => void,
  ): void {
    if (state.transition || state.exitStartedAt > 0) return;

    const screen = this.screens.get(state.currentScreen);
    if (!screen) return;

    const screenState = state.screenStates[state.currentScreen];
    const controls = getScreenControls(state, state.currentScreen);
    const result = screen.handle(screenState, state, event, controls);

    switch (result.type) {
      case "stay":
        break;

      case "navigate":
        this.doNavigate(state, result.target, sessionControls, scheduleAction);
        break;

      case "back":
        this.doBack(state, sessionControls, scheduleAction);
        break;

      case "exit":
        this.doExit(state, result.action, result.payload, sessionControls, scheduleAction);
        break;
    }
  }

  private doNavigate(
    state: TApp,
    targetId: string,
    sessionControls: SessionControls<TApp>,
    scheduleAction: (fn: (c: SessionControls<TApp>) => Promise<void>) => void,
  ): void {
    const targetScreen = this.screens.get(targetId);
    if (!targetScreen) return;

    const maxDepth = this.options.maxNavDepth;
    if (state.navStack.length >= maxDepth - 1) {
      if (state.navStack.length === 0) return;
      // Max depth reached — pop instead
      this.doBack(state, sessionControls, scheduleAction);
      return;
    }

    const entered = targetScreen.enter ? targetScreen.enter(state) : { state: {} as any, options: [] };
    const now = Date.now();

    sessionControls.setState((prev) => ({
      ...prev,
      transition: { type: "push", from: prev.currentScreen, to: targetId, direction: 1, startedAt: now },
      navStack: [...prev.navStack, prev.currentScreen],
      screenStates: { ...prev.screenStates, [targetId]: entered.state },
    }));

    scheduleAction(async (c) => {
      const initDone = targetScreen.init ? targetScreen.init(c).catch(() => {}) : Promise.resolve();
      await Promise.all([initDone, new Promise((r) => setTimeout(r, this.options.transitionMs))]);
      c.setState((prev) => ({ ...prev, currentScreen: targetId, transition: null }));
    });
  }

  private doBack(
    state: TApp,
    sessionControls: SessionControls<TApp>,
    scheduleAction: (fn: (c: SessionControls<TApp>) => Promise<void>) => void,
  ): void {
    if (state.navStack.length === 0) return;
    const prevScreen = state.navStack[state.navStack.length - 1];
    const now = Date.now();

    sessionControls.setState((prev) => ({
      ...prev,
      transition: { type: "pop", from: prev.currentScreen, to: prevScreen, direction: -1, startedAt: now },
      navStack: prev.navStack.slice(0, -1),
    }));

    scheduleAction(async (c) => {
      await new Promise((r) => setTimeout(r, this.options.transitionMs));
      c.setState((prev) => ({ ...prev, currentScreen: prevScreen, transition: null }));
    });
  }

  private doExit(
    state: TApp,
    action: string,
    payload: string | undefined,
    sessionControls: SessionControls<TApp>,
    scheduleAction: (fn: (c: SessionControls<TApp>) => Promise<void>) => void,
  ): void {
    sessionControls.setState((prev) => ({ ...prev, exitStartedAt: Date.now() }));

    scheduleAction(async (c) => {
      await new Promise((r) => setTimeout(r, this.options.exitAnimationMs));
      c.resolve({ type: "exit", action, payload } as any);
    });
  }

  // ── Animation check ────────────────────────────────────────────────────

  shouldAnimate(state: TApp, now: number, motion: MotionProfile): boolean {
    if (state.exitStartedAt > 0) return true;
    if (state.transition) return true;

    const screen = this.screens.get(state.currentScreen);
    if (!screen?.shouldAnimate) return motion.ambient;

    const screenState = state.screenStates[state.currentScreen];
    return screen.shouldAnimate(screenState, state, now, motion);
  }
}
