import type { KeyEvent } from "../types.js";
import { normalizePastedLineInput } from "../text/measure.js";

const ESC = "\x1b";
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

export function parseKeyEvents(raw: Buffer | string): KeyEvent[] {
  const input = raw.toString("utf8");
  return parseInput(input, false).events;
}

export class KeyParser {
  private pending = "";

  parse(raw: Buffer | string): KeyEvent[] {
    const input = this.pending + raw.toString("utf8");
    const parsed = parseInput(input, true);
    this.pending = parsed.pending;
    return parsed.events;
  }

  flush(): KeyEvent[] {
    if (this.pending.length === 0) return [];
    const parsed = parseInput(this.pending, false);
    this.pending = "";
    return parsed.events;
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }

  pendingKind(): "none" | "escape" | "paste" | "sequence" {
    if (this.pending.length === 0) return "none";
    if (this.pending === ESC) return "escape";
    if (this.pending.startsWith(PASTE_START)) return "paste";
    return "sequence";
  }
}

function parseInput(input: string, holdIncomplete: boolean): { events: KeyEvent[]; pending: string } {
  if (input.length === 0) return { events: [], pending: "" };

  const events: KeyEvent[] = [];
  let index = 0;
  while (index < input.length) {
    const rest = input.slice(index);
    if (holdIncomplete && isIncompleteSequence(rest)) {
      return { events, pending: rest };
    }
    if (rest.startsWith(PASTE_START)) {
      const end = rest.indexOf(PASTE_END, PASTE_START.length);
      if (end !== -1) {
        events.push({
          name: "paste",
          input: normalizePastedLineInput(rest.slice(PASTE_START.length, end)),
          ctrl: false,
          meta: false,
          shift: false,
        });
        index += end + PASTE_END.length;
        continue;
      }
      if (holdIncomplete) return { events, pending: rest };
    }
    const named = namedPrefix(rest);
    if (named) {
      events.push(named.event);
      index += named.length;
      continue;
    }
    const ch = Array.from(rest)[0] ?? "";
    if (ch.length === 0) break;
    events.push(namedKey(ch) ?? charEvent(ch));
    index += ch.length;
  }
  return { events, pending: "" };
}

function isIncompleteSequence(input: string): boolean {
  if (input.length === 0) return false;
  if (PASTE_START.startsWith(input) && input.length < PASTE_START.length) return true;
  const candidates = [`${ESC}[3~`, `${ESC}[A`, `${ESC}[B`, `${ESC}[C`, `${ESC}[D`];
  return candidates.some((candidate) => candidate.startsWith(input) && input.length < candidate.length);
}

function namedPrefix(input: string): { event: KeyEvent; length: number } | null {
  const candidates = [`${ESC}[3~`, `${ESC}[A`, `${ESC}[B`, `${ESC}[C`, `${ESC}[D`, ESC];
  for (const candidate of candidates) {
    if (input.startsWith(candidate)) {
      const event = namedKey(candidate);
      if (event) return { event, length: candidate.length };
    }
  }
  return null;
}

function namedKey(input: string): KeyEvent | null {
  const base = { input, ctrl: false, meta: false, shift: false };
  switch (input) {
    case "\x03":
      return { ...base, name: "char", input: "c", ctrl: true };
    case "\x0b":
      return { ...base, name: "char", input: "k", ctrl: true };
    case "\r":
    case "\n":
      return { ...base, name: "enter" };
    case "\x7f":
    case "\b":
      return { ...base, name: "backspace" };
    case "\t":
      return { ...base, name: "tab" };
    case " ":
      return { ...base, name: "space" };
    case ESC:
      return { ...base, name: "escape" };
    case `${ESC}[A`:
      return { ...base, name: "up" };
    case `${ESC}[B`:
      return { ...base, name: "down" };
    case `${ESC}[C`:
      return { ...base, name: "right" };
    case `${ESC}[D`:
      return { ...base, name: "left" };
    case `${ESC}[3~`:
      return { ...base, name: "delete" };
    default:
      return null;
  }
}

function charEvent(input: string): KeyEvent {
  const code = input.charCodeAt(0);
  if (code > 0 && code <= 26) {
    return { name: "char", input: String.fromCharCode(code + 96), ctrl: true, meta: false, shift: false };
  }
  return { name: "char", input, ctrl: false, meta: false, shift: false };
}
