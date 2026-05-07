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
          alt: false,
          shift: false,
        });
        index += end + PASTE_END.length;
        continue;
      }
      if (holdIncomplete) return { events, pending: rest };
    }
    const mouse = mousePrefix(rest);
    if (mouse) {
      events.push(mouse.event);
      index += mouse.length;
      continue;
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
  if (input.startsWith(`${ESC}[<`) && !/\x1b\[<\d+;\d+;\d+[Mm]/.test(input)) return true;
  // CSI sequences (arrows, f-keys, modifier+arrows, etc.)
  if (input.startsWith(`${ESC}[`) && input.length < 6) {
    const candidates = [
      `${ESC}[A`, `${ESC}[B`, `${ESC}[C`, `${ESC}[D`,       // arrows
      `${ESC}[1;2`, `${ESC}[1;3`, `${ESC}[1;4`, `${ESC}[1;5`, `${ESC}[1;6`, `${ESC}[1;7`, `${ESC}[1;8`, // modifier+arrows (digit)
      `${ESC}[H`, `${ESC}[F`,                                 // home, end
      `${ESC}[3~`, `${ESC}[5~`, `${ESC}[6~`,                 // delete, pgup, pgdn
      `${ESC}[11~`, `${ESC}[12~`, `${ESC}[13~`, `${ESC}[14~`, `${ESC}[15~`, // F1-F5
      `${ESC}[17~`, `${ESC}[18~`, `${ESC}[19~`, `${ESC}[20~`, `${ESC}[21~`, // F6-F10
      `${ESC}[23~`, `${ESC}[24~`,                             // F11-F12
      `${ESC}[Z`,                                              // shift+tab
    ];
    return candidates.some((candidate) => candidate.startsWith(input) && input.length < candidate.length);
  }
  // Kitty protocol patterns
  if (input.startsWith(`${ESC}[`) && input.length < 10) {
    if (/\x1b\[<?\d+/.test(input) && !/[u~]$/.test(input)) return true;
  }
  return false;
}

function mousePrefix(input: string): { event: KeyEvent; length: number } | null {
  const match = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(input);
  if (!match) return null;
  const code = Number(match[1]);
  const x = Math.max(0, Number(match[2]) - 1);
  const y = Math.max(0, Number(match[3]) - 1);
  const suffix = match[4];
  let type: "move" | "down" | "up" | "scroll";
  let scrollDirection: "up" | "down" | undefined;
  if (code === 64) {
    type = "scroll";
    scrollDirection = "up";
  } else if (code === 65) {
    type = "scroll";
    scrollDirection = "down";
  } else if (suffix === "m") {
    type = "up";
  } else if ((code & 32) === 32) {
    type = "move";
  } else {
    type = "down";
  }
  return {
    length: match[0].length,
    event: {
      name: "mouse",
      input: "",
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
      mouse: {
        type,
        x,
        y,
        button: code & 3,
        scrollDirection,
      },
    },
  };
}

function namedPrefix(input: string): { event: KeyEvent; length: number } | null {
  // Modifier+arrow and modifier+Home/End CSI sequences: ESC[<param>;<mod>A..D,H,F
  const modArrow = /^\x1b\[(\d+);(\d+)([ABCDHF])/.exec(input);
  if (modArrow) {
    const param = Number(modArrow[1]);
    const mod = Number(modArrow[2]);
    const letter = modArrow[3];
    const baseEvent = namedKey(`${ESC}[${letter}`);
    if (baseEvent) {
      return { length: modArrow[0].length, event: applyModifiers(baseEvent, mod, param) };
    }
  }
  // F-keys: ESC[11~ through ESC[24~
  const fKey = /^\x1b\[(\d{2})~/.exec(input);
  if (fKey) {
    const num = Number(fKey[1]);
    const fMap: Record<number, string> = {
      11: "F1", 12: "F2", 13: "F3", 14: "F4", 15: "F5",
      17: "F6", 18: "F7", 19: "F8", 20: "F9", 21: "F10",
      23: "F11", 24: "F12",
    };
    if (fMap[num]) {
      const name = fMap[num].toLowerCase() as KeyEvent["name"];
      return { length: fKey[0].length, event: key(name, { input: fKey[0] }) };
    }
  }
  // Standard named sequences + F-key O-format
  const candidates = [
    `${ESC}[3~`, `${ESC}[5~`, `${ESC}[6~`,     // delete, pageUp, pageDown
    `${ESC}[H`, `${ESC}[F`,                       // home, end
    `${ESC}[A`, `${ESC}[B`, `${ESC}[C`, `${ESC}[D`, // arrows
    `${ESC}[Z`,                                    // shift+tab
    `${ESC}OP`, `${ESC}OQ`, `${ESC}OR`, `${ESC}OS`, // F1-F4 (O-format)
    ESC,                                            // escape
  ];
  for (const candidate of candidates) {
    if (input.startsWith(candidate)) {
      const event = namedKey(candidate);
      if (event) return { event, length: candidate.length };
    }
  }
  // Kitty keyboard protocol: ESC[_keycode_;modifiers_u
  const kitty = /^\x1b\[<?(\d+);?(\d+)?([u~])/.exec(input);
  if (kitty) {
    const keycode = Number(kitty[1]);
    const mod = kitty[2] ? Number(kitty[2]) : 0;
    const suffix = kitty[3];
    // Map kitty keycodes to named keys
    const kittyMap: Record<number, string> = {
      57356: "up", 57357: "down", 57358: "left", 57359: "right",
      57360: "home", 57361: "end",
      57362: "pageUp", 57363: "pageDown",
      57364: "delete", 57365: "backspace",
      57366: "enter", 57367: "space", 57368: "tab",
      57369: "escape",
      57370: "F1", 57371: "F2", 57372: "F3", 57373: "F4",
      57374: "F5", 57375: "F6", 57376: "F7",
      57377: "F8", 57378: "F9", 57379: "F10",
      57380: "F11", 57381: "F12",
    };
    if (kittyMap[keycode]) {
      const name = kittyMap[keycode].toLowerCase() as KeyEvent["name"];
      const event = applyModifiers(key(name, { input: kitty[0] }), mod, 1);
      return { event, length: kitty[0].length };
    }
    // Printable key via kitty
    if (mod > 0 && suffix === "u" && keycode >= 32 && keycode <= 126) {
      const ch = String.fromCharCode(keycode);
      const event = applyModifiers(charEvent(ch), mod, 1);
      return { event, length: kitty[0].length };
    }
  }
  return null;
}

type KeyEventFields = Partial<Omit<KeyEvent, "name">>;

function namedKey(input: string): KeyEvent | null {
  switch (input) {
    case "\x03":
      return key("char", { input: "c", ctrl: true });
    case "\r":
    case "\n":
      return key("enter");
    case "\x7f":
    case "\b":
      return key("backspace");
    case "\t":
      return key("tab");
    case " ":
      return key("space");
    case ESC:
      return key("escape");
    case `${ESC}[A`:
      return key("up");
    case `${ESC}[B`:
      return key("down");
    case `${ESC}[C`:
      return key("right");
    case `${ESC}[D`:
      return key("left");
    case `${ESC}[H`:
      return key("home");
    case `${ESC}[F`:
      return key("end");
    case `${ESC}[3~`:
      return key("delete");
    case `${ESC}[5~`:
      return key("pageUp");
    case `${ESC}[6~`:
      return key("pageDown");
    case `${ESC}[Z`:
      return key("tab", { shift: true });
    case `${ESC}OP`:
      return key("f1");
    case `${ESC}OQ`:
      return key("f2");
    case `${ESC}OR`:
      return key("f3");
    case `${ESC}OS`:
      return key("f4");
    default:
      return null;
  }
}

function charEvent(input: string): KeyEvent {
  const code = input.charCodeAt(0);
  if (code > 0 && code <= 26) {
    return key("char", { input: String.fromCharCode(code + 96), ctrl: true });
  }
  return key("char", { input });
}

function applyModifiers(event: KeyEvent, mod: number, _param: number): KeyEvent {
  // SGR modifier encoding: 1=base, 2=shift, 3=alt, 4=alt+shift,
  //   5=ctrl, 6=ctrl+shift, 7=ctrl+alt, 8=ctrl+alt+shift
  const m = mod - 1;
  return {
    ...event,
    shift: (m & 1) !== 0,
    alt: (m & 2) !== 0,
    ctrl: (m & 4) !== 0,
    meta: (m & 8) !== 0,
  };
}

function key(name: KeyEvent["name"], fields: KeyEventFields = {}): KeyEvent {
  return {
    name,
    input: fields.input ?? "",
    ctrl: fields.ctrl ?? false,
    meta: fields.meta ?? false,
    alt: fields.alt ?? false,
    shift: fields.shift ?? false,
    mouse: fields.mouse,
  };
}
