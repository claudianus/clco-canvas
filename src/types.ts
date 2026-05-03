export type Tone = "normal" | "muted" | "primary" | "success" | "warning" | "danger" | "info";
export type Rgb = readonly [number, number, number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Style {
  tone?: Tone;
  fg?: Rgb;
  bg?: Rgb;
  bold?: boolean;
  dim?: boolean;
  inverse?: boolean;
}

export interface Span {
  text: string;
  style?: Style;
}

export interface Cell {
  ch: string;
  style: Style;
}

export type KeyName =
  | "up"
  | "down"
  | "left"
  | "right"
  | "enter"
  | "escape"
  | "backspace"
  | "delete"
  | "tab"
  | "space"
  | "paste"
  | "char";

export interface KeyEvent {
  name: KeyName;
  input: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

export interface MouseEvent {
  type: "move" | "down" | "up";
  x: number;
  y: number;
  button: number;
}

export interface CapabilityProfile {
  isTty: boolean;
  columns: number;
  rows: number;
  colorDepth: number;
  trueColor: boolean;
  unicode: boolean;
  alternateScreen: boolean;
  bracketedPaste: boolean;
  mouse: boolean;
  legacy: boolean;
}

export interface PaintCommand {
  type: "text" | "box" | "rule" | "meter" | "sparkline";
  rect: Rect;
  text?: string;
  style?: Style;
  title?: string;
  value?: number;
  values?: number[];
}

export interface SceneNode {
  type: "stack" | "text" | "box" | "table" | "menu" | "raw";
  rect?: Rect;
  style?: Style;
  title?: string;
  text?: string;
  children?: SceneNode[];
}
