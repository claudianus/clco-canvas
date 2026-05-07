export type MotionProfileName = "none" | "calm" | "cinematic" | "turbo" | "bouncy" | "dreamy" | "snappy";

export interface MotionProfile {
  name: MotionProfileName;
  frameMs: number;
  rippleMs: number;
  transitionMs: number;
  marqueeDelayMs: number;
  ambient: boolean;
}

export const motionProfiles: Record<MotionProfileName, MotionProfile> = {
  none: {
    name: "none",
    frameMs: 0,
    rippleMs: 0,
    transitionMs: 0,
    marqueeDelayMs: 3600,
    ambient: false,
  },
  calm: {
    name: "calm",
    frameMs: 96,
    rippleMs: 440,
    transitionMs: 420,
    marqueeDelayMs: 3600,
    ambient: false,
  },
  cinematic: {
    name: "cinematic",
    frameMs: 48,
    rippleMs: 680,
    transitionMs: 720,
    marqueeDelayMs: 3200,
    ambient: true,
  },
  turbo: {
    name: "turbo",
    frameMs: 33,
    rippleMs: 520,
    transitionMs: 520,
    marqueeDelayMs: 2600,
    ambient: true,
  },
  bouncy: {
    name: "bouncy",
    frameMs: 40,
    rippleMs: 520,
    transitionMs: 560,
    marqueeDelayMs: 2400,
    ambient: true,
  },
  dreamy: {
    name: "dreamy",
    frameMs: 80,
    rippleMs: 900,
    transitionMs: 1000,
    marqueeDelayMs: 4200,
    ambient: true,
  },
  snappy: {
    name: "snappy",
    frameMs: 25,
    rippleMs: 300,
    transitionMs: 340,
    marqueeDelayMs: 1800,
    ambient: false,
  },
};

export function motionProfileNames(): MotionProfileName[] {
  return Object.keys(motionProfiles).sort() as MotionProfileName[];
}

export function getMotionProfile(name?: string): MotionProfile {
  return motionProfiles[normalizeMotionProfileName(name)];
}

export function normalizeMotionProfileName(name?: string): MotionProfileName {
  if (name && Object.prototype.hasOwnProperty.call(motionProfiles, name)) {
    return name as MotionProfileName;
  }
  return "cinematic";
}
