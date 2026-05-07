// @clco-canvas/text — CJK-first text utilities for terminal applications
export {
  displayWidth,
  displayBytes,
  segmentGraphemes,
  truncateText,
  fitDisplay,
  stripAnsi,
  normalizePastedLineInput,
} from "./measure.js";

export {
  wrapText,
  wrapLines,
  alignText,
  renderParagraph,
} from "./wrap.js";

export type { TextAlign, WrapMode, WrapOptions } from "./wrap.js";
