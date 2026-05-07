import { describe, expect, it } from "vitest";
import { CellBuffer } from "../buffer/cell-buffer.js";
import {
  ScreenNavigator,
  ScreenDef,
  ScreenResult,
  ScreenControls,
  NavigableState,
  RenderContext,
} from "../runtime/navigator.js";

// ── Minimal test app state ──────────────────────────────────────────────

interface TestApp extends NavigableState {
  message: string;
}

function createApp(overrides: Partial<TestApp> = {}): TestApp {
  return {
    currentScreen: "home",
    screenStates: {},
    transition: null,
    navStack: [],
    exitStartedAt: 0,
    extras: {},
    message: "hello",
    ...overrides,
  };
}

const testCtx: RenderContext = {
  width: 40,
  height: 10,
  trueColor: true,
  frame: 0,
  now: 1000,
  motion: { ambient: false, transitionMs: 420, tickMs: 16 },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function makeScreen(id: string, text: string): ScreenDef<TestApp, string> {
  return {
    id,
    enter: (app) => ({ state: text, options: [] }),
    render: (buf, state, _app, _ctx) => {
      buf.write(0, 0, `[${text}]`, {}, 40);
    },
    handle: (_state, _app, _event, _controls) => ({ type: "stay" }),
  };
}

function makeControls(): ScreenControls<TestApp> {
  return {
    setAppState: () => {},
    updateScreenState: () => {},
    scheduleAction: () => {},
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("ScreenNavigator", () => {
  describe("registration", () => {
    it("registers and retrieves a screen", () => {
      const nav = new ScreenNavigator<TestApp>();
      const screen = makeScreen("home", "Home");
      nav.register(screen);
      expect(nav.getScreen("home")).toBe(screen);
    });

    it("returns undefined for unknown screen", () => {
      const nav = new ScreenNavigator<TestApp>();
      expect(nav.getScreen("nope")).toBeUndefined();
    });
  });

  describe("rendering", () => {
    it("renders the current screen", () => {
      const nav = new ScreenNavigator<TestApp>();
      const screen = makeScreen("home", "Home");
      nav.register(screen);

      const app = createApp({ screenStates: { home: "Home" } });
      const buf = nav.renderApp(app, testCtx);

      expect(buf.get(0, 0).ch).toBe("[");
    });

    it("renders nothing when screen is missing", () => {
      const nav = new ScreenNavigator<TestApp>();
      const app = createApp();
      const buf = nav.renderApp(app, testCtx);
      // Should not throw; buffer is empty
      expect(buf).toBeDefined();
    });
  });

  describe("animation check", () => {
    it("returns true during transition", () => {
      const nav = new ScreenNavigator<TestApp>();
      const app = createApp({
        transition: { type: "push", from: "a", to: "b", direction: 1, startedAt: 1000 },
      });
      expect(nav.shouldAnimate(app, 1000, testCtx.motion)).toBe(true);
    });

    it("returns true during exit animation", () => {
      const nav = new ScreenNavigator<TestApp>();
      const app = createApp({ exitStartedAt: 1000 });
      expect(nav.shouldAnimate(app, 1000, testCtx.motion)).toBe(true);
    });

    it("delegates to screen shouldAnimate when idle", () => {
      const nav = new ScreenNavigator<TestApp>();
      const screen = makeScreen("home", "Home");
      nav.register(screen);
      const app = createApp({ screenStates: { home: "Home" } });
      // screen has no shouldAnimate, so defaults to motion.ambient
      expect(nav.shouldAnimate(app, 1000, { ...testCtx.motion, ambient: false })).toBe(false);
    });
  });

  describe("handleEvent", () => {
    it("delegates to current screen", () => {
      const nav = new ScreenNavigator<TestApp>();
      let handled = false;
      const screen: ScreenDef<TestApp, string> = {
        id: "home",
        render: () => {},
        handle: (_state, _app, _event, _controls) => {
          handled = true;
          return { type: "stay" };
        },
      };
      nav.register(screen);

      const app = createApp({ screenStates: { home: "Home" } });
      const dummyControls = {
        setState: () => {},
        resolve: () => {},
      } as any;

      nav.handleEvent(
        app,
        { name: "char", input: "x", ctrl: false, meta: false, alt: false, shift: false },
        dummyControls,
        (_s, _id) => makeControls(),
        () => {},
      );
      expect(handled).toBe(true);
    });
  });
});
