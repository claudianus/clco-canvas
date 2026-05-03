import type { Rgb, Style, Tone } from "../types.js";

export interface Theme {
  name: string;
  tones: Record<Tone, Rgb>;
  surface: Rgb;
  surfaceRaised: Rgb;
  text: Rgb;
  muted: Rgb;
}

export const defaultTheme: Theme = {
  name: "midnight-cyan",
  tones: {
    normal: [224, 232, 240],
    muted: [120, 132, 144],
    primary: [0, 214, 255],
    success: [72, 242, 109],
    warning: [255, 216, 77],
    danger: [255, 92, 120],
    info: [91, 140, 255],
  },
  surface: [2, 4, 6],
  surfaceRaised: [10, 16, 24],
  text: [224, 232, 240],
  muted: [120, 132, 144],
};

export function defineTheme(theme: Partial<Theme> & { name: string }): Theme {
  return {
    ...defaultTheme,
    ...theme,
    tones: { ...defaultTheme.tones, ...(theme.tones ?? {}) },
  };
}

export function toneStyle(theme: Theme, tone: Tone = "normal", style: Style = {}): Style {
  return { ...style, fg: style.fg ?? theme.tones[tone], tone };
}

export function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

