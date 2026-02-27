/* Based on https://ngxtension.dev/utilities/signals/to-lazy-signal */

import type { Signal } from '@angular/core';
import { computed, untracked } from '@angular/core';
import type { ToSignalOptions } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Observable, Subscribable } from 'rxjs';
import { runInInjector } from './run-injector';

type ReturnType<T, U> = (T | U) | (T | undefined) | (T | null) | T;

export function toLazySignal<T>(source: Observable<T> | Subscribable<T>): Signal<T | undefined>;

export function toLazySignal<T>(
  source: Observable<T> | Subscribable<T>,
  options: ToSignalOptions<T> & { initialValue?: undefined; requireSync?: false },
): Signal<T | undefined>;

export function toLazySignal<T>(
  source: Observable<T> | Subscribable<T>,
  options: ToSignalOptions<T> & { initialValue?: null; requireSync?: false },
): Signal<T | null>;

export function toLazySignal<T>(
  source: Observable<T> | Subscribable<T>,
  options: ToSignalOptions<T> & { initialValue?: undefined; requireSync: true },
): Signal<T>;

export function toLazySignal<T, const U extends T>(
  source: Observable<T> | Subscribable<T>,
  options: ToSignalOptions<T> & { initialValue: U; requireSync?: false },
): Signal<T | U>;

/**
 * Function `toLazySignal()` is a proxy function that will call the original
 * `toSignal()` function when the returned signal is read for the first time.
 */
export function toLazySignal<T, U = undefined>(
  source: Observable<T> | Subscribable<T>,
  options?: ToSignalOptions<T> & { initialValue?: U },
): Signal<ReturnType<T, U>> {
  return runInInjector(toLazySignal, options, ({ injector }) => {
    let s: Signal<ReturnType<T, U>>;
    return computed<ReturnType<T, U>>(() => {
      if (!s) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s = untracked(() => toSignal(source, { ...options, injector } as any));
      }
      return s();
    });
  });
}
