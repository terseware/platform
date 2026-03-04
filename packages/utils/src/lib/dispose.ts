import { DestroyRef, inject, Injector } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';

/**
 * Wraps a cleanup function so it runs exactly once — either when called manually
 * or when the `destroyRef` is destroyed, whichever comes first.
 *
 * @returns A dispose function; calling it early also removes the destroy listener.
 *
 * @example
 * const dispose = disposer(destroyRef, () => subscription.unsubscribe());
 * // Later, if needed before destroy:
 * dispose();
 */
export function disposer(destroyRef: DestroyRef, fn: () => void): () => void {
  let called = false;
  const cleanup = () => {
    if (!called) {
      called = true;
      fn();
    }
  };
  const rmDestroy = destroyRef.onDestroy(cleanup);
  return () => {
    if (!called) {
      called = true;
      rmDestroy();
      fn();
    }
  };
}

/**
 * Injection-context-aware wrapper around {@link disposer}.
 * Resolves the `DestroyRef` from the current or provided injector,
 * then returns the dispose function produced by `factory`.
 *
 * @remarks
 * Prefer this over {@link disposer} when you don't have a `DestroyRef` on hand.
 *
 * @example
 * const dispose = disposable(myFn, injector, () => {
 *   const sub = stream$.subscribe();
 *   return () => sub.unsubscribe();
 * });
 */
export function disposable(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  fn: Function,
  injector: Injector | null | undefined,
  factory: () => () => void,
): () => void {
  return assertInjector(fn, injector, () => disposer(inject(DestroyRef), factory()));
}

export function injectorFallback(
  injector: Injector | null | undefined,
  fallback: Injector,
): Injector {
  return injector ?? tryGetInjector() ?? fallback;
}

function tryGetInjector(): Injector | null {
  try {
    return inject(Injector);
  } catch {
    return null;
  }
}
