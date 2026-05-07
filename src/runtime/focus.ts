import type { KeyEvent } from "../types.js";

export interface Focusable {
  id: string;
  tabIndex: number;
}

export class FocusManager<T extends Focusable> {
  private items: T[] = [];
  private focusedIndex = -1;

  setItems(items: T[]): void {
    this.items = [...items].sort((a, b) => a.tabIndex - b.tabIndex);
    if (this.focusedIndex >= this.items.length) {
      this.focusedIndex = this.items.length > 0 ? 0 : -1;
    }
  }

  getFocused(): T | null {
    if (this.focusedIndex < 0 || this.focusedIndex >= this.items.length) return null;
    return this.items[this.focusedIndex];
  }

  focusIndex(index: number): void {
    if (this.items.length === 0) {
      this.focusedIndex = -1;
      return;
    }
    this.focusedIndex = Math.max(0, Math.min(index, this.items.length - 1));
  }

  focus(id: string): void {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.focusedIndex = index;
  }

  next(): void {
    if (this.items.length === 0) return;
    this.focusedIndex = (this.focusedIndex + 1) % this.items.length;
  }

  prev(): void {
    if (this.items.length === 0) return;
    this.focusedIndex = (this.focusedIndex - 1 + this.items.length) % this.items.length;
  }

  handleEvent(event: KeyEvent): boolean {
    if (event.name === "tab") {
      if (event.shift) {
        this.prev();
      } else {
        this.next();
      }
      return true;
    }
    return false;
  }

  isFocused(id: string): boolean {
    return this.getFocused()?.id === id;
  }
}
