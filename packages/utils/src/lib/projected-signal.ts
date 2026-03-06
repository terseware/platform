import type { WritableSignal } from '@angular/core';
import { computed } from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';

export type ProjectedSignal<T> = WritableSignal<T>;

export type ProjectedSignalOptions<T> = {
  computation: () => T;
  update: (value: T) => void;
};

export function projectedSignal<T>(opts: ProjectedSignalOptions<T>): ProjectedSignal<T> {
  const internalSignal = computed(opts.computation);
  return Object.assign(() => internalSignal(), {
    [SIGNAL]: internalSignal[SIGNAL],
    set: (value: T) => opts.update(value),
    update: (updateFn: (value: T) => T) => {
      const newValue = updateFn(internalSignal());
      opts.update(newValue);
    },
    asReadonly: () => internalSignal,
  } as WritableSignal<T>);
}
