import { describe, expect, it } from "vitest";
import {
  captureSnapshot,
  snapshotToText,
  snapshotsEqual,
  snapshotDiff,
  snapshotToFileString,
  parseSnapshotFile,
} from "../testing/buffer-snapshot.js";
import {
  assertTextContains,
  assertTextNotContains,
  assertCellEquals,
} from "../testing/scenario-runner.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

describe("BufferSnapshot", () => {
  it("captures buffer to snapshot", () => {
    const buf = new CellBuffer(10, 3);
    buf.write(0, 0, "Hello", {}, 10);
    buf.write(0, 1, "World", {}, 10);
    const snap = captureSnapshot(buf);
    expect(snap.width).toBe(10);
    expect(snap.height).toBe(3);
    expect(snap.rows[0]).toBe("Hello");
    expect(snap.rows[1]).toBe("World");
  });

  it("snapshotToText joins rows", () => {
    const snap = { width: 5, height: 2, rows: ["Hello", "World"] };
    expect(snapshotToText(snap)).toBe("Hello\nWorld");
  });

  it("snapshotsEqual detects equality", () => {
    const a = { width: 5, height: 2, rows: ["A", "B"] };
    const b = { width: 5, height: 2, rows: ["A", "B"] };
    const c = { width: 5, height: 2, rows: ["A", "C"] };
    expect(snapshotsEqual(a, b)).toBe(true);
    expect(snapshotsEqual(a, c)).toBe(false);
  });

  it("snapshotsEqual detects different row counts", () => {
    const a = { width: 5, height: 2, rows: ["A", "B"] };
    const b = { width: 5, height: 3, rows: ["A", "B", "C"] };
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it("snapshotDiff shows differences", () => {
    const a = { width: 5, height: 2, rows: ["AAA", "BBB"] };
    const b = { width: 5, height: 2, rows: ["AAA", "CCC"] };
    const diff = snapshotDiff(a, b);
    expect(diff).toHaveLength(3);
    expect(diff[0]).toContain("Line 2");
  });

  it("round-trips through file format", () => {
    const buf = new CellBuffer(12, 2);
    buf.write(0, 0, "snapshot", {}, 12);
    const snap = captureSnapshot(buf);
    const fileStr = snapshotToFileString(snap);
    const parsed = parseSnapshotFile(fileStr);
    expect(parsed).not.toBeNull();
    expect(parsed!.width).toBe(12);
    expect(parsed!.height).toBe(2);
    expect(snapshotsEqual(snap, parsed!)).toBe(true);
  });

  it("parseSnapshotFile returns null for invalid header", () => {
    expect(parseSnapshotFile("not a snapshot")).toBeNull();
    expect(parseSnapshotFile("")).toBeNull();
  });
});

describe("ScenarioRunner assertions", () => {
  it("assertTextContains passes for matching text", () => {
    const buf = new CellBuffer(20, 2);
    buf.write(0, 0, "Hello World", {}, 20);
    assertTextContains(buf, "Hello World");
  });

  it("assertTextContains throws for missing text", () => {
    const buf = new CellBuffer(20, 2);
    expect(() => assertTextContains(buf, "Missing")).toThrow();
  });

  it("assertTextNotContains throws for present text", () => {
    const buf = new CellBuffer(20, 2);
    buf.write(0, 0, "Present", {}, 20);
    expect(() => assertTextNotContains(buf, "Present")).toThrow();
  });

  it("assertCellEquals checks specific cell", () => {
    const buf = new CellBuffer(10, 3);
    buf.set(3, 1, "X", {});
    assertCellEquals(buf, 3, 1, "X");
  });

  it("assertCellEquals throws for mismatch", () => {
    const buf = new CellBuffer(10, 3);
    buf.set(3, 1, "Y", {});
    expect(() => assertCellEquals(buf, 3, 1, "X")).toThrow();
  });
});
