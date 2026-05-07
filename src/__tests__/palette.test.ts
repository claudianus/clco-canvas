import { describe, expect, it } from "vitest";
import { buildPalette, toneRgb } from "../style/palette.js";
import { defaultTheme } from "../style/theme.js";

describe("buildPalette", () => {
  it("derives a palette from a theme", () => {
    const p = buildPalette(defaultTheme);
    expect(p.text).toEqual(defaultTheme.text);
    expect(p.muted).toEqual(defaultTheme.muted);
    expect(p.surface).toEqual(defaultTheme.surface);
    expect(p.cyan).toEqual(defaultTheme.tones.primary);
    expect(p.blue).toEqual(defaultTheme.tones.info);
    expect(p.green).toEqual(defaultTheme.tones.success);
    expect(p.amber).toEqual(defaultTheme.tones.warning);
    expect(p.red).toEqual(defaultTheme.tones.danger);
    expect(p.hint).toBeDefined();
    expect(p.frameMuted).toBeDefined();
    expect(p.glow).toBeDefined();
    expect(p.selBg).toBeDefined();
    expect(p.selHi).toBeDefined();
  });
});

describe("toneRgb", () => {
  it("maps success tone to green", () => {
    const p = buildPalette(defaultTheme);
    expect(toneRgb(p, "success")).toEqual(defaultTheme.tones.success);
  });

  it("maps warning tone to amber", () => {
    const p = buildPalette(defaultTheme);
    expect(toneRgb(p, "warning")).toEqual(defaultTheme.tones.warning);
  });

  it("maps danger tone to red", () => {
    const p = buildPalette(defaultTheme);
    expect(toneRgb(p, "danger")).toEqual(defaultTheme.tones.danger);
  });

  it("maps info tone to blue", () => {
    const p = buildPalette(defaultTheme);
    expect(toneRgb(p, "info")).toEqual(defaultTheme.tones.info);
  });

  it("maps primary to cyan", () => {
    const p = buildPalette(defaultTheme);
    expect(toneRgb(p, "primary")).toEqual(defaultTheme.tones.primary);
  });
});
