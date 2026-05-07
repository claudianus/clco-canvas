import { describe, expect, it } from "vitest";
import { PluginManager, definePlugin, Plugin, PluginContext } from "../plugins/manager.js";

function makePlugin(
  name: string,
  version: string,
  deps: Record<string, string> = {},
  onActivate?: (ctx: PluginContext) => void,
  onDeactivate?: () => void,
): Plugin {
  return definePlugin(
    { name, version, dependencies: deps },
    (ctx) => {
      if (onActivate) onActivate(ctx);
    },
    onDeactivate,
  );
}

describe("PluginManager", () => {
  it("registers and retrieves plugins", () => {
    const pm = new PluginManager();
    const p = makePlugin("test", "1.0.0");
    pm.register(p);
    expect(pm.get("test")).toBe(p);
    expect(pm.getAll()).toHaveLength(1);
  });

  it("throws on duplicate registration", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("dup", "1.0.0"));
    expect(() => pm.register(makePlugin("dup", "2.0.0"))).toThrow("already registered");
  });

  it("unregisters plugins", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("test", "1.0.0"));
    expect(pm.unregister("test")).toBe(true);
    expect(pm.get("test")).toBeUndefined();
  });

  it("resolves simple dependencies", () => {
    const pm = new PluginManager();
    const a = makePlugin("a", "1.0.0");
    const b = makePlugin("b", "1.0.0", { a: "^1.0.0" });
    pm.register(b);
    pm.register(a);

    const order = pm.resolve();
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("resolves with no dependencies", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("a", "1.0.0"));
    pm.register(makePlugin("b", "1.0.0"));
    pm.register(makePlugin("c", "1.0.0"));

    const order = pm.resolve();
    expect(order).toHaveLength(3);
  });

  it("detects circular dependencies", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("a", "1.0.0", { b: "^1.0.0" }));
    pm.register(makePlugin("b", "1.0.0", { a: "^1.0.0" }));

    expect(() => pm.resolve()).toThrow("Circular dependency");
  });

  it("throws on missing dependency", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("a", "1.0.0", { missing: "^1.0.0" }));

    expect(() => pm.resolve()).toThrow("not registered");
  });

  it("activates plugins in dependency order", async () => {
    const pm = new PluginManager();
    const order: string[] = [];

    pm.register(makePlugin("a", "1.0.0", {}, () => order.push("a")));
    pm.register(makePlugin("b", "1.0.0", { a: "^1.0.0" }, () => order.push("b")));
    pm.register(makePlugin("c", "1.0.0", { b: "^1.0.0" }, () => order.push("c")));

    await pm.activateAll();
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("deactivates in reverse order", async () => {
    const pm = new PluginManager();
    const order: string[] = [];

    pm.register(makePlugin("a", "1.0.0", {}, () => {}, () => order.push("a")));
    pm.register(makePlugin("b", "1.0.0", { a: "^1.0.0" }, () => {}, () => order.push("b")));

    await pm.activateAll();
    await pm.deactivateAll();
    expect(order).toEqual(["b", "a"]);
  });

  it("activateAll is idempotent", async () => {
    const pm = new PluginManager();
    let count = 0;
    pm.register(makePlugin("a", "1.0.0", {}, () => count++));

    await pm.activateAll();
    await pm.activateAll();
    expect(count).toBe(1);
  });

  it("dependencyGraph returns adjacency list", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("a", "1.0.0"));
    pm.register(makePlugin("b", "1.0.0", { a: "^1.0.0" }));

    const graph = pm.dependencyGraph();
    expect(graph["a"]).toEqual([]);
    expect(graph["b"]).toEqual(["a"]);
  });

  it("validate catches missing deps and version mismatches", () => {
    const pm = new PluginManager();
    pm.register(makePlugin("a", "1.0.0", { missing: "^1.0.0" }));
    pm.register(makePlugin("b", "2.0.0", {}));
    pm.register(makePlugin("c", "1.0.0", { b: "^1.0.0" }));

    const errors = pm.validate();
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("widget registry works through context", async () => {
    const pm = new PluginManager();
    class TestWidget {}
    let registered: any;

    pm.register(
      definePlugin({ name: "w", version: "1.0.0" }, (ctx) => {
        ctx.registerWidget("test", TestWidget as any);
        registered = ctx.getWidget("test");
      }),
    );

    await pm.activateAll();
    expect(registered).toBe(TestWidget);
  });
});
