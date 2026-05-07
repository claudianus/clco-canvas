import type { Rgb, Style, Tone } from "../types.js";

export interface Theme {
  name: string;
  tones: Record<Tone, Rgb>;
  surface: Rgb;
  surfaceRaised: Rgb;
  text: Rgb;
  muted: Rgb;
}

export type ThemePresetName =
  | "midnight-cyan" | "aurora" | "ember" | "graphite" | "paper"
  | "neon" | "sunset" | "ocean" | "forest" | "candy" | "matrix" | "lavender";

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

export const themePresets: Record<ThemePresetName, Theme> = {
  "midnight-cyan": defaultTheme,
  aurora: defineTheme({
    name: "aurora",
    tones: {
      normal: [232, 238, 240],
      muted: [139, 151, 158],
      primary: [82, 240, 189],
      success: [123, 245, 116],
      warning: [255, 214, 102],
      danger: [255, 98, 126],
      info: [112, 179, 255],
    },
    surface: [3, 8, 10],
    surfaceRaised: [8, 22, 22],
    text: [232, 238, 240],
    muted: [139, 151, 158],
  }),
  ember: defineTheme({
    name: "ember",
    tones: {
      normal: [240, 232, 222],
      muted: [158, 143, 132],
      primary: [255, 174, 82],
      success: [104, 226, 134],
      warning: [255, 212, 89],
      danger: [255, 94, 95],
      info: [116, 178, 255],
    },
    surface: [12, 7, 6],
    surfaceRaised: [30, 18, 13],
    text: [240, 232, 222],
    muted: [158, 143, 132],
  }),
  graphite: defineTheme({
    name: "graphite",
    tones: {
      normal: [230, 234, 238],
      muted: [132, 140, 148],
      primary: [148, 220, 255],
      success: [112, 230, 156],
      warning: [242, 207, 93],
      danger: [244, 101, 124],
      info: [157, 184, 255],
    },
    surface: [5, 7, 9],
    surfaceRaised: [18, 22, 26],
    text: [230, 234, 238],
    muted: [132, 140, 148],
  }),
  paper: defineTheme({
    name: "paper",
    tones: {
      normal: [34, 43, 48],
      muted: [95, 108, 116],
      primary: [0, 126, 156],
      success: [35, 135, 78],
      warning: [171, 112, 0],
      danger: [190, 53, 70],
      info: [57, 104, 185],
    },
    surface: [245, 246, 242],
    surfaceRaised: [232, 238, 236],
    text: [34, 43, 48],
    muted: [95, 108, 116],
  }),
  neon: defineTheme({
    name: "neon",
    tones: {
      normal: [242, 230, 255],
      muted: [160, 140, 180],
      primary: [255, 50, 180],
      success: [80, 255, 140],
      warning: [255, 230, 70],
      danger: [255, 70, 100],
      info: [100, 180, 255],
    },
    surface: [18, 4, 38],
    surfaceRaised: [32, 14, 54],
    text: [242, 230, 255],
    muted: [160, 140, 180],
  }),
  sunset: defineTheme({
    name: "sunset",
    tones: {
      normal: [250, 236, 222],
      muted: [188, 155, 127],
      primary: [255, 160, 60],
      success: [120, 220, 140],
      warning: [255, 210, 80],
      danger: [255, 80, 80],
      info: [130, 180, 240],
    },
    surface: [28, 10, 6],
    surfaceRaised: [48, 22, 14],
    text: [250, 236, 222],
    muted: [188, 155, 127],
  }),
  ocean: defineTheme({
    name: "ocean",
    tones: {
      normal: [218, 240, 246],
      muted: [120, 166, 182],
      primary: [20, 210, 190],
      success: [90, 230, 130],
      warning: [240, 210, 90],
      danger: [240, 90, 110],
      info: [90, 170, 240],
    },
    surface: [3, 12, 24],
    surfaceRaised: [8, 26, 44],
    text: [218, 240, 246],
    muted: [120, 166, 182],
  }),
  forest: defineTheme({
    name: "forest",
    tones: {
      normal: [228, 240, 222],
      muted: [140, 168, 126],
      primary: [100, 240, 80],
      success: [120, 240, 140],
      warning: [240, 210, 80],
      danger: [240, 90, 100],
      info: [100, 180, 240],
    },
    surface: [6, 14, 4],
    surfaceRaised: [16, 30, 12],
    text: [228, 240, 222],
    muted: [140, 168, 126],
  }),
  candy: defineTheme({
    name: "candy",
    tones: {
      normal: [40, 42, 50],
      muted: [120, 124, 138],
      primary: [0, 190, 210],
      success: [40, 180, 100],
      warning: [200, 140, 20],
      danger: [210, 60, 80],
      info: [60, 130, 210],
    },
    surface: [252, 248, 244],
    surfaceRaised: [238, 234, 228],
    text: [40, 42, 50],
    muted: [120, 124, 138],
  }),
  matrix: defineTheme({
    name: "matrix",
    tones: {
      normal: [200, 255, 200],
      muted: [80, 140, 80],
      primary: [0, 255, 70],
      success: [60, 240, 100],
      warning: [220, 230, 60],
      danger: [240, 60, 70],
      info: [70, 180, 240],
    },
    surface: [0, 2, 0],
    surfaceRaised: [2, 10, 2],
    text: [200, 255, 200],
    muted: [80, 140, 80],
  }),
  lavender: defineTheme({
    name: "lavender",
    tones: {
      normal: [235, 228, 248],
      muted: [155, 144, 175],
      primary: [170, 120, 240],
      success: [100, 225, 140],
      warning: [240, 200, 90],
      danger: [235, 90, 110],
      info: [110, 160, 240],
    },
    surface: [14, 8, 28],
    surfaceRaised: [26, 18, 44],
    text: [235, 228, 248],
    muted: [155, 144, 175],
  }),
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

export function themePresetNames(): ThemePresetName[] {
  return Object.keys(themePresets).sort() as ThemePresetName[];
}

export function getThemePreset(name?: string): Theme {
  const key = normalizeThemePresetName(name);
  return themePresets[key];
}

export function normalizeThemePresetName(name?: string): ThemePresetName {
  if (name && Object.prototype.hasOwnProperty.call(themePresets, name)) {
    return name as ThemePresetName;
  }
  return defaultTheme.name as ThemePresetName;
}

export function mixRgb(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
