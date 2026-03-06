import { inject, Injector, ɵgetLContext } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';

// Cache NodeInjector prototype
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodeInjProto: any | null = null;

/**
 * Get the injector for an instance.
 */
export function getInj(
  instance: object,
  options: { injector?: Injector | null | undefined; optional: true },
): Injector | null;
export function getInj(
  instance: object,
  options?: { injector?: Injector | null | undefined; optional?: boolean },
): Injector;
export function getInj(
  instance: object,
  options?: { injector?: Injector | null | undefined; optional?: boolean },
): Injector | null {
  return assertInjector(getInj, options?.injector, () => {
    const context = getLContext(instance);
    if (!context?.lView) {
      if (options?.optional) {
        return null;
      }
      throw new Error(`No lView found for given object: ${instance}`);
    }

    const { lView, nodeIndex } = context;
    const tNode = lView[1].data[nodeIndex];

    const currInj = options?.injector ?? inject(Injector);

    // NodeInjector is the only Injector implementation with _tNode/_lView.
    // Property names are stable — @angular/core ships unminified fesm2022.
    if ('_tNode' in currInj && '_lView' in currInj) {
      const nodeInj = Object.create((nodeInjProto ??= Object.getPrototypeOf(currInj)));
      nodeInj._tNode = tNode;
      nodeInj._lView = lView;
      return nodeInj;
    }

    // Fallback: we're inside an environment injector context (e.g. service constructor,
    // or runInInjectionContext with an EnvironmentInjector).
    // lView[9] is the env injector — node-scoped tokens won't resolve.
    return lView[9];
  });
}

export function getLContext(instance: object): ReturnType<typeof ɵgetLContext> | null {
  try {
    return ɵgetLContext(instance);
  } catch {
    return null;
  }
}
