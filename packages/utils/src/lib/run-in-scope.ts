import type { EffectCleanupRegisterFn } from '@angular/core';
import { Injector, runInInjectionContext, untracked } from '@angular/core';

export function runInScope<T>(
  injector: Injector,
  onCleanup: EffectCleanupRegisterFn,
  fn: () => T,
): T {
  return untracked(() => {
    const child = Injector.create({ providers: [], parent: injector });
    const result = runInInjectionContext(child, () => fn());
    onCleanup(() => child.destroy());
    return result;
  });
}
