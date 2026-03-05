import { SignalWeakMap } from './signal-weak-map';

// A unique symbol to use as the map value (since Sets only care about keys)
const PRESENT = Symbol('PRESENT');

export class SignalWeakSet<T extends WeakKey> implements WeakSet<T> {
  private _map = new SignalWeakMap<T, typeof PRESENT>();

  constructor(values?: readonly T[] | null) {
    if (values) {
      for (const value of values) {
        this._map.set(value, PRESENT);
      }
    }
    return this;
  }

  has(value: T): boolean {
    return this._map.has(value);
  }

  add(value: T): this {
    this._map.set(value, PRESENT);
    return this;
  }

  delete(value: T): boolean {
    return this._map.delete(value);
  }

  get [Symbol.toStringTag](): string {
    return 'SignalWeakSet';
  }
}
