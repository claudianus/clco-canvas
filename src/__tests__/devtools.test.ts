import { describe, expect, it } from "vitest";
import { FrameRecorder, FramePlayer, serializeRecording, deserializeRecording } from "../devtools/frame-recorder.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

describe("FrameRecorder", () => {
  it("starts empty", () => {
    const rec = new FrameRecorder();
    expect(rec.isRecording()).toBe(false);
    expect(rec.frameCount()).toBe(0);
  });

  it("records frames", () => {
    const rec = new FrameRecorder();
    rec.start(80, 24);
    expect(rec.isRecording()).toBe(true);

    const buf1 = new CellBuffer(80, 24);
    buf1.write(0, 0, "Frame 1", {}, 80);
    rec.record(buf1);

    const buf2 = new CellBuffer(80, 24);
    buf2.write(0, 0, "Frame 2", {}, 80);
    rec.record(buf2, { name: "tab", input: "\t", ctrl: false, meta: false, alt: false, shift: false });

    expect(rec.frameCount()).toBe(2);

    const recording = rec.stop();
    expect(recording).not.toBeNull();
    expect(recording!.frames).toHaveLength(2);
    expect(recording!.frames[1].event?.name).toBe("tab");
    expect(rec.isRecording()).toBe(false);
  });

  it("stop returns null when not recording", () => {
    const rec = new FrameRecorder();
    expect(rec.stop()).toBeNull();
  });
});

describe("FramePlayer", () => {
  it("plays back recorded frames", () => {
    const rec = new FrameRecorder();
    rec.start(10, 2);

    const buf1 = new CellBuffer(10, 2);
    buf1.write(0, 0, "Initial", {}, 10);
    rec.record(buf1, { name: "char", input: "a", ctrl: false, meta: false, alt: false, shift: false });

    const buf2 = new CellBuffer(10, 2);
    buf2.write(0, 0, "Updated", {}, 10);
    rec.record(buf2);

    const recording = rec.stop()!;

    const player = new FramePlayer();
    player.load(recording);

    expect(player.currentFrame()?.snapshot.rows[0]).toBe("Initial");
    expect(player.currentEvent()?.name).toBe("char");

    player.next();
    expect(player.currentFrame()?.snapshot.rows[0]).toBe("Updated");
    expect(player.currentEvent()).toBeUndefined();

    expect(player.next()).toBe(false);
  });

  it("seek navigates to frame", () => {
    const rec = new FrameRecorder();
    rec.start(10, 1);
    rec.record(new CellBuffer(10, 1));
    rec.record(new CellBuffer(10, 1));
    rec.record(new CellBuffer(10, 1));
    const recording = rec.stop()!;

    const player = new FramePlayer();
    player.load(recording);
    player.seek(2);
    expect(player.progress()).toBe(2 / 3);
  });

  it("prev goes backward", () => {
    const rec = new FrameRecorder();
    rec.start(10, 1);
    rec.record(new CellBuffer(10, 1));
    rec.record(new CellBuffer(10, 1));
    rec.record(new CellBuffer(10, 1));
    const recording = rec.stop()!;

    const player = new FramePlayer();
    player.load(recording);
    player.seek(2);
    expect(player.prev()).toBe(true);
    expect(player.progress()).toBe(1 / 3);
    expect(player.prev()).toBe(true);
    expect(player.progress()).toBe(0);
    expect(player.prev()).toBe(false);
  });

  it("rewind goes to start", () => {
    const rec = new FrameRecorder();
    rec.start(10, 1);
    rec.record(new CellBuffer(10, 1));
    rec.record(new CellBuffer(10, 1));
    const recording = rec.stop()!;

    const player = new FramePlayer();
    player.load(recording);
    player.seek(1);
    player.rewind();
    expect(player.progress()).toBe(0);
  });

  it("serialization round-trips", () => {
    const rec = new FrameRecorder();
    rec.start(80, 24);
    const buf = new CellBuffer(80, 24);
    buf.write(0, 0, "Test", {}, 80);
    rec.record(buf, { name: "enter", input: "\r", ctrl: false, meta: false, alt: false, shift: false });
    const recording = rec.stop()!;

    const json = serializeRecording(recording);
    const restored = deserializeRecording(json);
    expect(restored).not.toBeNull();
    expect(restored!.frames).toHaveLength(1);
    expect(restored!.frames[0].snapshot.rows[0]).toBe("Test");
    expect(restored!.frames[0].event?.name).toBe("enter");
  });

  it("deserializeRecording returns null for invalid data", () => {
    expect(deserializeRecording("not json")).toBeNull();
    expect(deserializeRecording('{"version":2}')).toBeNull();
  });

  it("playback rate defaults to 1", () => {
    const player = new FramePlayer();
    expect(player.getPlaybackRate()).toBe(1);
    player.setPlaybackRate(2);
    expect(player.getPlaybackRate()).toBe(2);
    player.setPlaybackRate(0); // clamped to 0.1
    expect(player.getPlaybackRate()).toBe(0.1);
  });
});
