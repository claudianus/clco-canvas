import type { CellBuffer } from "../buffer/cell-buffer.js";

export interface BufferSnapshot {
  width: number;
  height: number;
  rows: string[];
}

export function captureSnapshot(buffer: CellBuffer): BufferSnapshot {
  const rows: string[] = [];
  for (let y = 0; y < buffer.height; y++) {
    let row = "";
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.get(x, y);
      row += cell.ch === "" ? " " : cell.ch;
    }
    rows.push(row.replace(/\s+$/, ""));
  }
  return {
    width: buffer.width,
    height: buffer.height,
    rows,
  };
}

export function snapshotToText(snapshot: BufferSnapshot): string {
  return snapshot.rows.join("\n").replace(/\n+$/, "");
}

export function snapshotsEqual(a: BufferSnapshot, b: BufferSnapshot): boolean {
  if (a.rows.length !== b.rows.length) return false;
  for (let i = 0; i < a.rows.length; i++) {
    if (a.rows[i] !== b.rows[i]) return false;
  }
  return true;
}

export function snapshotDiff(
  a: BufferSnapshot,
  b: BufferSnapshot,
): string[] {
  const diff: string[] = [];
  const maxRows = Math.max(a.rows.length, b.rows.length);
  for (let i = 0; i < maxRows; i++) {
    const aRow = a.rows[i] ?? "(missing)";
    const bRow = b.rows[i] ?? "(missing)";
    if (aRow !== bRow) {
      diff.push(`Line ${i + 1}:`);
      diff.push(`  - ${aRow}`);
      diff.push(`  + ${bRow}`);
    }
  }
  return diff;
}

export function snapshotToFileString(snapshot: BufferSnapshot): string {
  const header = `# clco-canvas snapshot v1 ${snapshot.width}x${snapshot.height}`;
  return [header, ...snapshot.rows].join("\n");
}

export function parseSnapshotFile(content: string): BufferSnapshot | null {
  const lines = content.split("\n");
  const header = lines[0] ?? "";
  const match = header.match(/# clco-canvas snapshot v1 (\d+)x(\d+)/);
  if (!match) return null;
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  return {
    width,
    height,
    rows: lines.slice(1),
  };
}
