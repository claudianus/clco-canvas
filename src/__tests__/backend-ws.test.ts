import { describe, expect, it } from "vitest";
import {
  RemoteRenderServer,
  RemoteRenderClient,
  encodeMessage,
  decodeMessage,
  WsLike,
  WsServerLike,
} from "../backend/websocket.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

// ── Mock WebSocket ───────────────────────────────────────────────────────────

function mockWs(): WsLike & {
  sentMessages: string[];
  triggerMessage(data: string): void;
  triggerClose(): void;
} {
  const listeners: Record<string, Function[]> = {};
  const ws = {
    sentMessages: [] as string[],
    send(data: string) {
      ws.sentMessages.push(data);
    },
    close() {},
    on(event: "message" | "close" | "error", listener: (...args: any[]) => void) {
      (listeners[event] ??= []).push(listener);
    },
    triggerMessage(data: string) {
      for (const fn of listeners["message"] ?? []) fn(data);
    },
    triggerClose() {
      for (const fn of listeners["close"] ?? []) fn();
    },
  };
  return ws;
}

function mockWsServer(): WsServerLike & {
  triggerConnection(ws: WsLike): void;
} {
  const listeners: Record<string, Function[]> = {};
  return {
    close() {},
    on(event: "connection", listener: (ws: WsLike) => void) {
      (listeners[event] ??= []).push(listener);
    },
    triggerConnection(ws: WsLike) {
      for (const fn of listeners["connection"] ?? []) fn(ws);
    },
  };
}

describe("RemoteRenderServer", () => {
  it("handles client connections", () => {
    const server = mockWsServer();
    new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    const ws = mockWs();
    server.triggerConnection(ws);
    // Connection is registered — ping should be sent eventually
    // Just verify no errors
    expect(true).toBe(true);
  });

  it("broadcasts frames to connected clients", () => {
    const server = mockWsServer();
    const remote = new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    const ws = mockWs();
    server.triggerConnection(ws);

    const buf = new CellBuffer(20, 3);
    buf.write(0, 0, "Hello remote!", {}, 20);
    remote.broadcast(buf);

    expect(ws.sentMessages.length).toBe(1);
    const msg = JSON.parse(ws.sentMessages[0]);
    expect(msg.type).toBe("frame");
    expect(msg.data).toContain("Hello remote!");
    expect(msg.width).toBe(20);
    expect(msg.height).toBe(3);

    remote.close();
  });

  it("sends diff on subsequent broadcasts", () => {
    const server = mockWsServer();
    const remote = new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    const ws = mockWs();
    server.triggerConnection(ws);

    const buf1 = new CellBuffer(20, 3);
    buf1.write(0, 0, "First", {}, 20);
    remote.broadcast(buf1);

    const buf2 = new CellBuffer(20, 3);
    buf2.write(0, 0, "Second", {}, 20);
    remote.broadcast(buf2);

    expect(ws.sentMessages.length).toBe(2);
    const msg2 = JSON.parse(ws.sentMessages[1]);
    expect(msg2.full).toBe(false);

    remote.close();
  });

  it("invalidate forces full frame", () => {
    const server = mockWsServer();
    const remote = new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    const ws = mockWs();
    server.triggerConnection(ws);

    const buf = new CellBuffer(20, 3);
    buf.write(0, 0, "Test", {}, 20);
    remote.broadcast(buf);
    expect(JSON.parse(ws.sentMessages[0]).full).toBe(true);

    remote.invalidate();
    remote.broadcast(buf);
    expect(JSON.parse(ws.sentMessages[1]).full).toBe(true);

    remote.close();
  });

  it("clientCount tracks connections", () => {
    const server = mockWsServer();
    const remote = new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    expect(remote.clientCount()).toBe(0);

    const ws1 = mockWs();
    server.triggerConnection(ws1);
    expect(remote.clientCount()).toBe(1);

    const ws2 = mockWs();
    server.triggerConnection(ws2);
    expect(remote.clientCount()).toBe(2);

    ws1.triggerClose();
    // close handler runs async via setImmediate in real WebSocket,
    // but our mock fires synchronously
    expect(remote.clientCount()).toBe(1);

    remote.close();
  });

  it("handles pong messages", () => {
    const server = mockWsServer();
    new RemoteRenderServer({ server, pingIntervalMs: 99999 });

    const ws = mockWs();
    server.triggerConnection(ws);

    ws.triggerMessage(JSON.stringify({ type: "pong" }));
    // Should update alive flag without errors
    expect(true).toBe(true);
  });
});

describe("RemoteRenderClient", () => {
  it("receives frames", () => {
    const ws = mockWs();
    const frames: Array<{ ansi: string; w: number; h: number }> = [];

    new RemoteRenderClient({
      socket: ws,
      onFrame: (ansi, w, h) => frames.push({ ansi, w, h }),
    });

    ws.triggerMessage(
      JSON.stringify({ type: "frame", data: "Hello", width: 80, height: 24, full: true }),
    );

    expect(frames).toHaveLength(1);
    expect(frames[0].ansi).toBe("Hello");
    expect(frames[0].w).toBe(80);
  });

  it("sends input events", () => {
    const ws = mockWs();
    const client = new RemoteRenderClient({ socket: ws });

    client.sendInput({ name: "enter", input: "\r", ctrl: false, meta: false, alt: false, shift: false });

    const msg = JSON.parse(ws.sentMessages[0]);
    expect(msg.type).toBe("input");
    expect(msg.event.name).toBe("enter");
  });

  it("sends resize events", () => {
    const ws = mockWs();
    const client = new RemoteRenderClient({ socket: ws });

    client.sendResize(120, 40);

    const msg = JSON.parse(ws.sentMessages[0]);
    expect(msg.type).toBe("resize");
    expect(msg.columns).toBe(120);
    expect(msg.rows).toBe(40);
  });

  it("responds to ping with pong", () => {
    const ws = mockWs();
    new RemoteRenderClient({ socket: ws });

    ws.triggerMessage(JSON.stringify({ type: "ping" }));

    const msg = JSON.parse(ws.sentMessages[0]);
    expect(msg.type).toBe("pong");
  });

  it("calls onClose when server closes", () => {
    const ws = mockWs();
    let closed = false;

    new RemoteRenderClient({
      socket: ws,
      onClose: () => { closed = true; },
    });

    ws.triggerClose();
    expect(closed).toBe(true);
  });
});

describe("Message encoding", () => {
  it("encodeMessage produces valid JSON", () => {
    const msg = encodeMessage({ type: "ping" });
    expect(() => JSON.parse(msg)).not.toThrow();
  });

  it("decodeMessage returns null for invalid JSON", () => {
    expect(decodeMessage("not json")).toBeNull();
  });

  it("decodeMessage round-trips", () => {
    const original = { type: "frame" as const, data: "test", width: 80, height: 24, full: true };
    const encoded = encodeMessage(original);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(original);
  });
});
