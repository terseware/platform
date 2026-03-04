import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { createNotifier } from 'ngxtension/create-notifier';

// Internal symbol to track deletion notifications safely
// We use this instead of 'undefined' so we can support maps that actually store 'undefined' as a value.
const REMOVED = Symbol('REMOVED');

export class SignalWeakMap<K extends WeakKey, V> {
  // Storage now holds V | REMOVED
  readonly #storage = new WeakMap<K, WritableSignal<V | typeof REMOVED>>();

  readonly #structure = createNotifier();

  constructor(entries?: readonly (readonly [K, V])[] | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.#storage.set(key, signal(value));
      }
    }

    return this;
  }

  get(key: K): V | undefined {
    const valueSignal = this.#storage.get(key);

    if (valueSignal) {
      // 1. Key exists: We listen ONLY to this signal.
      // If this key is deleted later, 'delete()' will fire this signal with REMOVED.
      const value = valueSignal();

      // Safety check: if we are in a computed chain where the map was just mutated
      // but the signal is still lingering.
      if (value === REMOVED) {
        return undefined;
      }
      return value as V;
    } else {
      // 2. Key missing: We must listen to _structure.
      // If we don't do this, we won't know when the key is added.
      this.#structure.listen();
      return undefined;
    }
  }

  set(key: K, value: V): this {
    const existingSignal = this.#storage.get(key);

    if (existingSignal) {
      // Key exists: Update value only.
      // Observers of this key update. Observers of 'structure' (keys/size) do NOT.
      existingSignal.set(value);
    } else {
      // New key: Add to storage and update structure.
      this.#storage.set(key, signal(value));
      this.#structure.notify();
    }
    return this;
  }

  delete(key: K): boolean {
    const existingSignal = this.#storage.get(key);

    if (existingSignal) {
      // STEP 1: Notify the specific signal listeners that this value is "changed" (to removed).
      // This forces effects relying on get(key) to re-run.
      existingSignal.set(REMOVED);

      // STEP 2: Remove from storage
      this.#storage.delete(key);

      // STEP 3: Notify structure listeners (keys/size/iterators)
      this.#structure.notify();
      return true;
    }
    return false;
  }

  has(key: K): boolean {
    this.#structure.listen();
    return this.#storage.has(key);
  }
}
