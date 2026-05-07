import { describe, expect, it } from "vitest";
import {
  buildLinearOutput,
  renderAccessibleStream,
  announceRegion,
  AccessibilityTree,
  AriaRegion,
} from "../accessibility/screen-reader.js";
import { CellBuffer } from "../buffer/cell-buffer.js";

describe("buildLinearOutput", () => {
  it("converts buffer to plain text", () => {
    const buf = new CellBuffer(10, 3);
    buf.write(0, 0, "Hello", {}, 10);
    buf.write(0, 1, "World", {}, 10);
    expect(buildLinearOutput(buf)).toBe("Hello\nWorld");
  });

  it("trims trailing empty lines", () => {
    const buf = new CellBuffer(40, 10);
    buf.write(0, 0, "Only one line", {}, 40);
    const output = buildLinearOutput(buf);
    expect(output).toBe("Only one line");
  });

  it("preserves internal blank lines", () => {
    const buf = new CellBuffer(10, 5);
    buf.write(0, 0, "Line 1", {}, 10);
    buf.write(0, 2, "Line 3", {}, 10);
    const output = buildLinearOutput(buf);
    expect(output).toContain("\n\n");
  });
});

describe("renderAccessibleStream", () => {
  it("renders tree with text content", () => {
    const tree: AccessibilityTree = {
      title: "Main Menu",
      regions: [
        { role: "heading", label: "Settings" },
        { role: "button", label: "Save", description: "Saves configuration" },
        {
          role: "list",
          label: "Providers",
          children: [
            { role: "listitem", label: "Anthropic" },
            { role: "listitem", label: "OpenAI" },
          ],
        },
      ],
    };

    const buf = new CellBuffer(20, 2);
    buf.write(0, 0, "Menu content", {}, 20);

    const output = renderAccessibleStream(tree, buf);
    expect(output).toContain("Screen: Main Menu");
    expect(output).toContain("[heading] Settings");
    expect(output).toContain("[button] Save (Saves configuration)");
    expect(output).toContain("[list] Providers");
    expect(output).toContain("  [listitem] Anthropic");
    expect(output).toContain("  [listitem] OpenAI");
    expect(output).toContain("--- Text Content ---");
    expect(output).toContain("Menu content");
  });

  it("renders empty tree", () => {
    const tree: AccessibilityTree = { title: "Empty", regions: [] };
    const buf = new CellBuffer(10, 1);
    const output = renderAccessibleStream(tree, buf);
    expect(output).toContain("Screen: Empty");
  });
});

describe("announceRegion", () => {
  it("announces region with all fields", () => {
    const region: AriaRegion = {
      role: "textbox",
      label: "Search",
      value: "claude",
      description: "Type to filter",
    };
    expect(announceRegion(region)).toBe("Search: claude: Type to filter");
  });

  it("announces region with only label", () => {
    const region: AriaRegion = { role: "button", label: "OK" };
    expect(announceRegion(region)).toBe("OK");
  });

  it("announces region with only value", () => {
    const region: AriaRegion = { role: "meter", value: "75%" };
    expect(announceRegion(region)).toBe("75%");
  });
});
