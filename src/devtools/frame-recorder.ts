import type { KeyEvent } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { captureSnapshot, BufferSnapshot } from "../testing/buffer-snapshot.js";

export interface Frame {
  timestamp: number;
  snapshot: BufferSnapshot;
  event?: KeyEvent;
}

export interface FrameRecording {
  frames: Frame[];
  startTime: number;
  width: number;
  height: number;
}

export class FrameRecorder {
  private recording: FrameRecording | null = null;

  start(width: number, height: number): void {
    this.recording = {
      frames: [],
      startTime: Date.now(),
      width,
      height,
    };
  }

  record(buffer: CellBuffer, event?: KeyEvent): void {
    if (!this.recording) return;
    this.recording.frames.push({
      timestamp: Date.now() - this.recording.startTime,
      snapshot: captureSnapshot(buffer),
      event: event ? { ...event } : undefined,
    });
  }

  stop(): FrameRecording | null {
    const result = this.recording;
    this.recording = null;
    return result;
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  frameCount(): number {
    return this.recording?.frames.length ?? 0;
  }
}

export class FramePlayer {
  private recording: FrameRecording | null = null;
  private index = 0;
  private playbackRate = 1;

  load(recording: FrameRecording): void {
    this.recording = recording;
    this.index = 0;
  }

  currentFrame(): Frame | null {
    if (!this.recording || this.index >= this.recording.frames.length) return null;
    return this.recording.frames[this.index];
  }

  currentEvent(): KeyEvent | undefined {
    return this.currentFrame()?.event;
  }

  next(): boolean {
    if (!this.recording) return false;
    if (this.index >= this.recording.frames.length - 1) return false;
    this.index++;
    return true;
  }

  prev(): boolean {
    if (this.index <= 0) return false;
    this.index--;
    return true;
  }

  seek(index: number): boolean {
    if (!this.recording || index < 0 || index >= this.recording.frames.length) return false;
    this.index = index;
    return true;
  }

  rewind(): void {
    this.index = 0;
  }

  progress(): number {
    if (!this.recording || this.recording.frames.length === 0) return 0;
    return this.index / this.recording.frames.length;
  }

  duration(): number {
    if (!this.recording || this.recording.frames.length === 0) return 0;
    return this.recording.frames[this.recording.frames.length - 1].timestamp;
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, rate);
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }
}

export function serializeRecording(recording: FrameRecording): string {
  return JSON.stringify({
    version: 1,
    ...recording,
    frames: recording.frames.map((f) => ({
      t: f.timestamp,
      s: f.snapshot,
      e: f.event
        ? { n: f.event.name, i: f.event.input, c: f.event.ctrl, m: f.event.meta, a: f.event.alt, s: f.event.shift }
        : undefined,
    })),
  });
}

export function deserializeRecording(json: string): FrameRecording | null {
  try {
    const data = JSON.parse(json);
    if (data.version !== 1) return null;
    return {
      frames: data.frames.map((f: any) => ({
        timestamp: f.t,
        snapshot: f.s,
        event: f.e
          ? { name: f.e.n, input: f.e.i, ctrl: f.e.c ?? false, meta: f.e.m ?? false, alt: f.e.a ?? false, shift: f.e.s ?? false }
          : undefined,
      })),
      startTime: 0,
      width: data.width,
      height: data.height,
    };
  } catch {
    return null;
  }
}
