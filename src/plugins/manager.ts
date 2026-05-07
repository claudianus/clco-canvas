import type { Widget } from "../widgets/widget.js";
import type { Style, KeyEvent } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import type { RenderContext } from "../runtime/navigator.js";

// ── Plugin context ───────────────────────────────────────────────────────────

export interface PluginContext {
  /** Register a new widget class for reuse */
  registerWidget(name: string, ctor: new (...args: any[]) => Widget<any>): void;
  /** Get a previously registered widget class */
  getWidget(name: string): (new (...args: any[]) => Widget<any>) | undefined;
  /** Theme colors available to plugins */
  theme: Record<string, string>;
  /** Log a message (routed to host application) */
  log(level: "debug" | "info" | "warn" | "error", message: string): void;
}

// ── Plugin interface ─────────────────────────────────────────────────────────

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: Record<string, string>; // plugin name -> semver range
}

export interface Plugin {
  readonly manifest: PluginManifest;
  activate(context: PluginContext): void | Promise<void>;
  deactivate(): void | Promise<void>;
}

// ── Plugin registry ─────────────────────────────────────────────────────────

export interface ResolvedPlugin {
  plugin: Plugin;
  dependencies: string[];
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private activationOrder: string[] = [];
  private widgetRegistry = new Map<string, new (...args: any[]) => Widget<any>>();
  private active = false;

  // ── Registration ─────────────────────────────────────────────────────────

  register(plugin: Plugin): void {
    const name = plugin.manifest.name;
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered`);
    }
    this.plugins.set(name, plugin);
  }

  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): Plugin[] {
    return [...this.plugins.values()];
  }

  // ── Dependency resolution ────────────────────────────────────────────────

  /**
   * Topological sort with cycle detection.
   * Returns plugin names in activation order (dependencies first).
   */
  resolve(): string[] {
    const resolved: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving "${name}"`);
      }

      const plugin = this.plugins.get(name);
      if (!plugin) {
        throw new Error(`Plugin "${name}" is not registered`);
      }

      visiting.add(name);

      const deps = plugin.manifest.dependencies ?? {};
      for (const depName of Object.keys(deps)) {
        if (!this.plugins.has(depName)) {
          throw new Error(`Plugin "${name}" depends on "${depName}" which is not registered`);
        }
        visit(depName);
      }

      visiting.delete(name);
      visited.add(name);
      resolved.push(name);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return resolved;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async activateAll(): Promise<void> {
    if (this.active) return;

    const order = this.resolve();
    const context = this.createContext();

    for (const name of order) {
      const plugin = this.plugins.get(name)!;
      await plugin.activate(context);
    }

    this.activationOrder = order;
    this.active = true;
  }

  async deactivateAll(): Promise<void> {
    if (!this.active) return;

    // Deactivate in reverse order
    for (const name of [...this.activationOrder].reverse()) {
      const plugin = this.plugins.get(name);
      if (plugin) {
        await plugin.deactivate();
      }
    }

    this.activationOrder = [];
    this.active = false;
  }

  // ── Dependency graph ─────────────────────────────────────────────────────

  /** Get the dependency graph as adjacency list */
  dependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [name, plugin] of this.plugins) {
      graph[name] = Object.keys(plugin.manifest.dependencies ?? {});
    }
    return graph;
  }

  /** Check if all dependencies are satisfied */
  validate(): string[] {
    const errors: string[] = [];
    for (const [name, plugin] of this.plugins) {
      const deps = plugin.manifest.dependencies ?? {};
      for (const [depName, depVersion] of Object.entries(deps)) {
        const dep = this.plugins.get(depName);
        if (!dep) {
          errors.push(`Plugin "${name}": dependency "${depName}" not found`);
        } else if (!satisfiesVersion(dep.manifest.version, depVersion)) {
          errors.push(
            `Plugin "${name}": requires "${depName}@${depVersion}" but found "${dep.manifest.version}"`,
          );
        }
      }
    }
    return errors;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private createContext(): PluginContext {
    return {
      registerWidget: (name, ctor) => {
        this.widgetRegistry.set(name, ctor);
      },
      getWidget: (name) => {
        return this.widgetRegistry.get(name);
      },
      theme: {},
      log: (_level, _message) => {
        // Default no-op; host should override
      },
    };
  }
}

// ── Minimal semver check ─────────────────────────────────────────────────────

function satisfiesVersion(actual: string, required: string): boolean {
  // Strip leading ^ ~ >= etc and compare major
  const cleanReq = required.replace(/^[\^~>=<]+\s*/, "");
  const reqParts = cleanReq.split(".").map(Number);
  const actParts = actual.split(".").map(Number);

  // Quick check: major must match for caret/tilde
  if (required.startsWith("^") || required.startsWith("~")) {
    if (reqParts[0] !== actParts[0]) return false;
    if (required.startsWith("~") && reqParts[1] !== actParts[1]) return false;
  }

  // Exact match for pinned versions
  if (!required.startsWith("^") && !required.startsWith("~") && !required.startsWith(">=")) {
    return actual === required;
  }

  return true;
}

// ── Helpers for creating plugins ─────────────────────────────────────────────

export function definePlugin(
  manifest: PluginManifest,
  activate: (ctx: PluginContext) => void | Promise<void>,
  deactivate?: () => void | Promise<void>,
): Plugin {
  return {
    manifest,
    activate,
    deactivate: deactivate ?? (() => {}),
  };
}
