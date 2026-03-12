import type { CreateEffectOptions, EffectRef, Injector, WritableSignal } from '@angular/core';
import { computed, effect, untracked } from '@angular/core';
import { computedPrevious } from 'ngxtension/computed-previous';
import { isUndefined } from './validators';

/** Listen for changes to a signal and call a function when the signal changes.*/
export function onChange<const T>(
  source: () => T,
  onChangeFn: (value: T, previousValue: T) => void,
  options?: { injector?: Injector },
): EffectRef {
  const previousValue = computedPrevious(source);
  return effect(() => {
    const value = source();
    if (value !== previousValue()) {
      untracked(() => onChangeFn(value, previousValue()));
    }
  }, options);
}

/** Listen for changes to a boolean signal and call one of two functions when the signal changes. */
export function onBoolChange(
  source: () => boolean,
  onTrue?: () => void,
  onFalse?: () => void,
  options?: { injector?: Injector },
): EffectRef {
  return onChange(source, value => (value ? onTrue?.() : onFalse?.()), options);
}

/** Bind a writable signal to a reactive source. */
export function signalBind<const T>(
  target: WritableSignal<T>,
  source: () => NoInfer<T> | undefined,
  options?: CreateEffectOptions,
): EffectRef {
  const value = computed(() => source());
  return effect(() => {
    const v = value();
    if (!isUndefined(v)) {
      target.set(v);
    }
  }, options);
}
