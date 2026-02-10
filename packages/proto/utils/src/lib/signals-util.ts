import type { Signal } from '@angular/core';
import { effect, inject, Injector, signal, untracked } from '@angular/core';

/** Listen for changes to a signal and call a function when the signal changes.*/
export function onChange<T>(
  source: Signal<T>,
  fn: (value: T, previousValue: T | null | undefined) => void,
  options?: { injector: Injector },
): void {
  const previousValue = signal(source());

  effect(
    () => {
      const value = source();
      if (value !== previousValue()) {
        untracked(() => fn(value, previousValue()));
        previousValue.set(value);
      }
    },
    { injector: options?.injector ?? inject(Injector) },
  );

  // call the fn with the initial value
  fn(source(), null);
}
