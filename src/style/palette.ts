import type { Rgb, Tone } from "../types.js";
import type { Theme } from "./theme.js";
import { mixRgb } from "./theme.js";

export interface Palette {
  text: Rgb;
  muted: Rgb;
  hint: Rgb;
  frame: Rgb;
  frameMuted: Rgb;
  cyan: Rgb;
  blue: Rgb;
  green: Rgb;
  amber: Rgb;
  red: Rgb;
  surface: Rgb;
  raised: Rgb;
  glow: Rgb;
  selBg: Rgb;
  selHi: Rgb;
}

export function buildPalette(theme: Theme): Palette {
  const p = theme.tones;
  return {
    text: theme.text,
    muted: theme.muted,
    hint: mixRgb(theme.muted, theme.text, 0.35),
    frame: p.primary,
    frameMuted: mixRgb(theme.surfaceRaised, p.primary, 0.32),
    cyan: p.primary,
    blue: p.info,
    green: p.success,
    amber: p.warning,
    red: p.danger,
    surface: theme.surface,
    raised: theme.surfaceRaised,
    glow: mixRgb(theme.surfaceRaised, p.primary, 0.22),
    selBg: mixRgb(theme.surfaceRaised, p.primary, 0.32),
    selHi: mixRgb(p.primary, theme.text, 0.2),
  };
}

export function toneRgb(palette: Palette, tone: Tone): Rgb {
  switch (tone) {
    case "success":
      return palette.green;
    case "warning":
      return palette.amber;
    case "danger":
      return palette.red;
    case "info":
      return palette.blue;
    case "muted":
      return palette.muted;
    case "normal":
      return palette.text;
    default:
      return palette.cyan;
  }
}
