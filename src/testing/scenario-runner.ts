import type { KeyEvent } from "../types.js";
import type { CellBuffer } from "../buffer/cell-buffer.js";
import { captureSnapshot, BufferSnapshot } from "./buffer-snapshot.js";

export interface ScenarioStep {
  name: string;
  input?: KeyEvent;
  assert?: (buffer: CellBuffer) => void;
}

export interface Scenario {
  name: string;
  steps: ScenarioStep[];
}

export interface ScenarioResult {
  name: string;
  passed: number;
  failed: number;
  errors: string[];
  snapshots: Array<{ step: string; snapshot: BufferSnapshot }>;
}

export function runScenario(
  scenario: Scenario,
  render: () => CellBuffer,
  handleEvent: (event: KeyEvent) => void,
  recordSnapshots = true,
): ScenarioResult {
  const result: ScenarioResult = {
    name: scenario.name,
    passed: 0,
    failed: 0,
    errors: [],
    snapshots: [],
  };

  for (const step of scenario.steps) {
    try {
      if (step.input) {
        handleEvent(step.input);
      }

      const buffer = render();
      if (recordSnapshots) {
        result.snapshots.push({ step: step.name, snapshot: captureSnapshot(buffer) });
      }

      if (step.assert) {
        step.assert(buffer);
      }

      result.passed++;
    } catch (err) {
      result.failed++;
      result.errors.push(
        `Step "${step.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}

export function assertTextContains(buffer: CellBuffer, text: string): void {
  const plain = buffer.toPlainString();
  if (!plain.includes(text)) {
    throw new Error(`Expected buffer to contain "${text}"`);
  }
}

export function assertTextNotContains(buffer: CellBuffer, text: string): void {
  const plain = buffer.toPlainString();
  if (plain.includes(text)) {
    throw new Error(`Expected buffer to NOT contain "${text}"`);
  }
}

export function assertCellEquals(
  buffer: CellBuffer,
  x: number,
  y: number,
  expected: string,
): void {
  const actual = buffer.get(x, y).ch;
  if (actual !== expected) {
    throw new Error(`Cell (${x},${y}): expected "${expected}", got "${actual}"`);
  }
}
