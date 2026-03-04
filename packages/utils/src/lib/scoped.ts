import type { EffectCleanupRegisterFn } from '@angular/core';
import { Injector, isDevMode, runInInjectionContext, untracked } from '@angular/core';
import type { ReactiveNode } from '@angular/core/primitives/signals';
import { getActiveConsumer } from '@angular/core/primitives/signals';

const tViewInjectorIndex = 9;

export function scoped<T>(
  fn: () => T,
  options?: {
    injector?: Injector | null | undefined;
    onCleanup?: EffectCleanupRegisterFn;
  },
): T {
  const consumer = (getActiveConsumer() ?? {}) as unknown as Partial<
    ReactiveNode & {
      cleanupFns?: (() => void)[];
      registerCleanupFn?: (fn: () => void) => void;
      injector?: Injector;
      sequence?: { view?: { [tViewInjectorIndex]: Injector } };
    }
  >;

  return untracked(() => {
    if (isDevMode() && !consumer) {
      throw new Error('Scoped called but no consumer was found');
    }

    let injector = options?.injector;
    if (!injector) {
      injector = (consumer?.injector ??
        consumer?.sequence?.view?.[tViewInjectorIndex] ??
        null) as Injector;

      if (isDevMode() && !injector) {
        throw new Error(
          'Proto: scoped called but no injector was discovered by the active consumer, a null injector will be used. Pass the injector parameter to scoped.',
        );
      }
    }

    const child = Injector.create({ providers: [], parent: injector });
    const result = runInInjectionContext(child, () => fn());
    if (options?.onCleanup) {
      options.onCleanup(() => child.destroy());
    } else if ('cleanupFns' in consumer) {
      (consumer.cleanupFns ??= []).push(() => child.destroy());
    } else if ('registerCleanupFn' in consumer) {
      consumer.registerCleanupFn(() => child.destroy());
    } else if (isDevMode()) {
      throw new Error(
        'Scoped called but no cleanup mechanism was found. Pass onCleanup to scoped.',
      );
    }
    return result;
  });
}

// fn => (node.cleanup ??= new Set()).add(fn)
