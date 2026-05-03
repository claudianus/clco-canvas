export interface FrameInfo {
  frame: number;
  now: number;
  deltaMs: number;
}

export interface FrameSchedulerOptions {
  fps?: number;
  reducedMotion?: boolean;
  onFrame: (frame: FrameInfo) => void;
}

export class FrameScheduler {
  private readonly fps: number;
  private readonly reducedMotion: boolean;
  private readonly onFrame: (frame: FrameInfo) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame = 0;
  private last = 0;

  constructor(options: FrameSchedulerOptions) {
    this.fps = Math.max(1, Math.min(60, Math.floor(options.fps ?? 60)));
    this.reducedMotion = options.reducedMotion ?? false;
    this.onFrame = options.onFrame;
  }

  start(): void {
    if (this.timer || this.reducedMotion) return;
    this.last = Date.now();
    this.schedule();
  }

  stop(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  private schedule(): void {
    const delay = Math.max(1, Math.round(1000 / this.fps));
    this.timer = setTimeout(() => {
      const now = Date.now();
      this.frame += 1;
      this.onFrame({ frame: this.frame, now, deltaMs: this.last === 0 ? 0 : now - this.last });
      this.last = now;
      if (this.timer) this.schedule();
    }, delay);
    this.timer.unref();
  }
}

