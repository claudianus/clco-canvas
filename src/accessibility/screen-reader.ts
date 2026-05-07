import type { CellBuffer } from "../buffer/cell-buffer.js";

export type AriaRole = "heading" | "button" | "textbox" | "list" | "listitem" | "dialog" | "tablist" | "tab" | "meter" | "alert" | "status" | "region";

export interface AriaRegion {
  role: AriaRole;
  label?: string;
  value?: string;
  description?: string;
  children?: AriaRegion[];
}

export interface AccessibilityTree {
  title: string;
  regions: AriaRegion[];
}

export function buildLinearOutput(buffer: CellBuffer): string {
  const lines: string[] = [];
  for (let y = 0; y < buffer.height; y++) {
    let line = "";
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.get(x, y);
      line += cell.ch === "" ? " " : cell.ch;
    }
    const trimmed = line.replace(/\s+$/, "");
    if (trimmed.length > 0 || lines.length > 0) {
      lines.push(trimmed);
    }
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.join("\n");
}

export function renderAccessibleStream(
  tree: AccessibilityTree,
  buffer: CellBuffer,
): string {
  const parts: string[] = [];

  parts.push(`Screen: ${tree.title}`);
  parts.push("");

  for (const region of tree.regions) {
    parts.push(...renderRegion(region, 0));
  }

  parts.push("");
  parts.push("--- Text Content ---");
  parts.push(buildLinearOutput(buffer));

  return parts.join("\n");
}

function renderRegion(region: AriaRegion, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];
  const label = region.label ?? "";
  const value = region.value ?? "";

  let header = `${indent}[${region.role}]`;
  if (label) header += ` ${label}`;
  if (value) header += ` = "${value}"`;
  if (region.description) header += ` (${region.description})`;

  lines.push(header);

  if (region.children) {
    for (const child of region.children) {
      lines.push(...renderRegion(child, depth + 1));
    }
  }

  return lines;
}

export function announceRegion(region: AriaRegion): string {
  const parts: string[] = [];
  if (region.label) parts.push(region.label);
  if (region.value) parts.push(region.value);
  if (region.description) parts.push(region.description);
  return parts.join(": ");
}
