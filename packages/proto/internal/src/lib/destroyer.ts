import { Injector, runInInjectionContext } from '@angular/core';
import type { InjectorOptions } from './run-injector';
import { runInInjector } from './run-injector';

export function runInDestroyer(
  fn: () => void,
  options: InjectorOptions = {},
): () => { destroy: () => void } {
  return runInInjector(runInDestroyer, options, ({ injector }) => {
    return () => {
      const childInjector = Injector.create({ providers: [], parent: injector });
      runInInjectionContext(childInjector, fn);
      return { destroy: () => childInjector.destroy() };
    };
  });
}
