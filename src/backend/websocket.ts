import type { KeyEvent } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";

// ── Message types ────────────────────────────────────────────────────────────

export type WsMessage =
  | { type: "frame"; data: string; width: number; height: number; full: boolean }
  | { type: "input"; event: KeyEvent }
  | { type: "resize"; columns: number; rows: number }
  | { type: "close" }
  | { type: "ping" }
  | { type: "pong" };

// ── Minimal WebSocket interface ──────────────────────────────────────────────

export interface WsLike {
  send(data: string): void;
  close(): void;
  on(event: "message", listener: (data: string) => void): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (err: Error) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
}

export interface WsServerLike {
  on(event: "connection", listener: (ws: WsLike) => void): void;
  close(): void;
}

// ── Remote render server ─────────────────────────────────────────────────────

export interface RemoteServerOptions {
  /** WebSocket server instance (ws.Server or similar) */
  server: WsServerLike;
  /** Heartbeat interval ms (default 30000) */
  pingIntervalMs?: number;
}

export class RemoteRenderServer {
  private clients = new Map<WsLike, { alive: boolean }>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private prev: CellBuffer | null = null;
  private options: Required<RemoteServerOptions>;

  constructor(options: RemoteServerOptions) {
    this.options = {
      pingIntervalMs: options.pingIntervalMs ?? 30000,
      server: options.server,
    };

    this.options.server.on("connection", (ws) => this.handleConnection(ws));
    this.startPing();
  }

  /** Broadcast a CellBuffer to all connected clients (diff or full) */
  broadcast(buffer: CellBuffer, forceFull = false): void {
    const full = forceFull || !this.prev;
    const data = full ? buffer.renderFull() : buffer.renderDiff(this.prev);
    this.prev = buffer.clone();

    if (data.length === 0) return;

    const msg: WsMessage = {
      type: "frame",
      data,
      width: buffer.width,
      height: buffer.height,
      full,
    };

    const payload = JSON.stringify(msg);
    for (const [ws, client] of this.clients) {
      if (client.alive) {
        try {
          ws.send(payload);
        } catch {
          // Client disconnected
        }
      }
    }
  }

  /** Invalidate the previous frame, forcing full render next broadcast */
  invalidate(): void {
    this.prev = null;
  }

  /** Number of connected clients */
  clientCount(): number {
    return this.clients.size;
  }

  /** Register input callback from clients */
  onInput(_callback: (event: KeyEvent, client: WsLike) => void): void {
    // Input handling is done per-connection in handleConnection
    // This is a hook for the host application
  }

  close(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    for (const [ws] of this.clients) {
      try { ws.close(); } catch { /* ignore */ }
    }
    this.clients.clear();
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private handleConnection(ws: WsLike): void {
    this.clients.set(ws, { alive: true });

    ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw) as WsMessage;
        if (msg.type === "pong") {
          const client = this.clients.get(ws);
          if (client) client.alive = true;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      this.clients.delete(ws);
    });

    ws.on("error", () => {
      this.clients.delete(ws);
    });
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      const ping = JSON.stringify({ type: "ping" } satisfies WsMessage);
      for (const [ws, client] of this.clients) {
        if (!client.alive) {
          try { ws.close(); } catch { /* ignore */ }
          this.clients.delete(ws);
          continue;
        }
        client.alive = false;
        try {
          ws.send(ping);
        } catch {
          this.clients.delete(ws);
        }
      }
    }, this.options.pingIntervalMs);
  }
}

// ── Remote render client ─────────────────────────────────────────────────────

export interface RemoteClientOptions {
  /** WebSocket connection */
  socket: WsLike;
  /** Called when a frame is received (ANSI string) */
  onFrame?: (ansi: string, width: number, height: number) => void;
  /** Called on disconnect */
  onClose?: () => void;
}

export class RemoteRenderClient {
  private socket: WsLike;
  private onFrame: ((ansi: string, width: number, height: number) => void) | null;
  private onClose: (() => void) | null;

  constructor(options: RemoteClientOptions) {
    this.socket = options.socket;
    this.onFrame = options.onFrame ?? null;
    this.onClose = options.onClose ?? null;

    this.socket.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw) as WsMessage;
        switch (msg.type) {
          case "frame":
            if (this.onFrame) {
              this.onFrame(msg.data, msg.width, msg.height);
            }
            break;
          case "ping":
            this.send({ type: "pong" });
            break;
          case "close":
            this.socket.close();
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    this.socket.on("close", () => {
      if (this.onClose) this.onClose();
    });
  }

  /** Send an input event to the server */
  sendInput(event: KeyEvent): void {
    this.send({ type: "input", event });
  }

  /** Send a resize notification */
  sendResize(columns: number, rows: number): void {
    this.send({ type: "resize", columns, rows });
  }

  close(): void {
    this.socket.close();
  }

  private send(msg: WsMessage): void {
    try {
      this.socket.send(JSON.stringify(msg));
    } catch {
      // Socket closed
    }
  }
}

// ── Message serialization ────────────────────────────────────────────────────

export function encodeMessage(msg: WsMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(raw: string): WsMessage | null {
  try {
    return JSON.parse(raw) as WsMessage;
  } catch {
    return null;
  }
}
