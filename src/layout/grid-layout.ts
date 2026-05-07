import type { Rect } from "../types.js";
import type { Constraint } from "./constraint.js";
import { resolveConstraints } from "./constraint.js";

export interface GridCell {
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
}

export interface GridDefinition {
  rows: Constraint[];
  cols: Constraint[];
  gap?: number;
}

export interface ResolvedGrid {
  rowHeights: number[];
  colWidths: number[];
  rowPositions: number[];
  colPositions: number[];
  cellRect: (cell: GridCell) => Rect;
}

export function resolveGrid(rect: Rect, def: GridDefinition): ResolvedGrid {
  const gap = def.gap ?? 0;
  const rowHeights = resolveConstraints(rect.h, def.rows, gap);
  const colWidths = resolveConstraints(rect.w, def.cols, gap);

  const rowPositions: number[] = [];
  let y = rect.y;
  for (let i = 0; i < rowHeights.length; i++) {
    rowPositions.push(y);
    y += rowHeights[i] + (i < rowHeights.length - 1 ? gap : 0);
  }

  const colPositions: number[] = [];
  let x = rect.x;
  for (let i = 0; i < colWidths.length; i++) {
    colPositions.push(x);
    x += colWidths[i] + (i < colWidths.length - 1 ? gap : 0);
  }

  function cellRect(cell: GridCell): Rect {
    const rs = Math.max(1, cell.rowSpan ?? 1);
    const cs = Math.max(1, cell.colSpan ?? 1);
    const top = rowPositions[cell.row] ?? rect.y;
    const left = colPositions[cell.col] ?? rect.x;

    let h = 0;
    for (let r = cell.row; r < cell.row + rs && r < rowHeights.length; r++) {
      h += rowHeights[r] ?? 0;
    }

    let w = 0;
    for (let c = cell.col; c < cell.col + cs && c < colWidths.length; c++) {
      w += colWidths[c] ?? 0;
    }

    return { x: left, y: top, w, h };
  }

  return { rowHeights, colWidths, rowPositions, colPositions, cellRect };
}
