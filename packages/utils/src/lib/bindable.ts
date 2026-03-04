import type { EffectRef, Signal, WritableSignal } from '@angular/core';
import { DestroyRef, effect, inject, Injector, isDevMode, isSignal, signal } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';
import { isUndefined } from './validators';

export function isBindableSignal(source: unknown): source is BindableSignal<unknown> {
  return isSignal(source) && (source as unknown as BindableSignal<unknown>).__bindable === true;
}

export type BindableSignal<T> = WritableSignal<T> & {
  __bindable: true;
  set: {
    (
      input: T | undefined | Signal<T | undefined>,
      opts?: { injector?: Injector | undefined },
    ): EffectRef;
  } & EffectRef;
};

export type BindableSignalOptions = {
  injector?: Injector | null | undefined;
};

export function bindable<T>(initialValue: T, options?: BindableSignalOptions): BindableSignal<T>;
export function bindable<T>(initialValue?: T | undefined): never;
export function bindable<T>(initialValue: T, options?: BindableSignalOptions): BindableSignal<T> {
  return assertInjector(bindable, options?.injector, () => {
    const sourceInjector = inject(Injector);
    const watchers: EffectRef[] = [];

    const source = signal(initialValue);
    const origSetFn = source.set.bind(source);

    const bindableSignal = source as BindableSignal<T | undefined>;
    bindableSignal.__bindable = true;

    function setBinding(value: T | undefined) {
      if (!isUndefined(value)) {
        origSetFn(value);
      }
    }

    const setFn = (
      input: T | undefined | Signal<T | undefined>,
      setFnOpts?: { injector?: Injector | null | undefined },
    ): EffectRef => {
      if (!isSignal(input)) {
        setBinding(input);
        return { destroy: () => void true };
      }

      setBinding(input());

      const callerInjector = getCallerInjector();
      if (isDevMode() && !setFnOpts?.injector && !callerInjector) {
        // eslint-disable-next-line no-console
        console.warn(
          'Proto: A bindable signal set function was called',
          'outside the injection context with a signal. This may lead to',
          'a memory leak. Make sure to call it within the injection context',
        );
      }

      const instanceInjector = setFnOpts?.injector ?? callerInjector ?? sourceInjector;

      const watcher = effect(() => setBinding(input()), { injector: instanceInjector });
      watchers.push(watcher);

      instanceInjector.get(DestroyRef).onDestroy(() => {
        const ix = watchers.indexOf(watcher);
        if (ix !== -1) {
          watchers.splice(ix, 1);
        }
      });

      return watcher;
    };

    bindableSignal.set = Object.assign(setFn, {
      destroy: () => watchers.forEach(watcher => watcher.destroy()),
    });

    return bindableSignal as BindableSignal<T>;
  });
}

function getCallerInjector(): Injector | undefined {
  try {
    return inject(Injector);
  } catch {
    return undefined;
  }
}
