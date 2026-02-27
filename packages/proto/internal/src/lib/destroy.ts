import { DestroyRef, inject, Injector, runInInjectionContext, untracked } from '@angular/core';
import type { ElementInjectorOptions, InjectorOptions } from './run-injector';
import { runInElementInjector, runInInjector } from './run-injector';
import type { Args, Fn } from './types';

export function onDestroy(fn: () => void, options: InjectorOptions = {}): () => void {
  return runInInjector(onDestroy, options, () => inject(DestroyRef).onDestroy(fn));
}

export function runInDestroyer<T, A extends Args>(
  fn: Fn<T, A>,
  options: ElementInjectorOptions = {},
): (...args: A) => () => void {
  return runInElementInjector(runInDestroyer, options, ({ injector }) => {
    return (...args: A) => {
      const childInjector = Injector.create({ providers: [], parent: injector });
      runInInjectionContext(childInjector, () => untracked(() => fn(...args)));
      return () => childInjector.destroy();
    };
  });
}
