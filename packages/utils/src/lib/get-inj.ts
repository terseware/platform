import type { Injector } from '@angular/core';
import { ɵgetLContext } from '@angular/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createInjFn: ((tNode: any, lView: any) => Injector) | null = null;

export function setCreateInjFn(injector: Injector): void {
  if (createInjFn) {
    return;
  }

  if (!('_tNode' in injector && '_lView' in injector)) {
    throw new Error(`Not a NodeInjector`);
  }

  const proto = Object.getPrototypeOf(injector);
  createInjFn = (tNode, lView) => {
    const nodeInj = Object.create(proto);
    nodeInj._tNode = tNode;
    nodeInj._lView = lView;
    return nodeInj;
  };
}

/**
 * Get the injector for an instance.
 */
export function getInj(instance: object, options: { optional: true }): Injector | null;
export function getInj(instance: object, options?: { optional?: boolean }): Injector;
export function getInj(instance: object, options?: { optional?: boolean }): Injector | null {
  const context = getLContext(instance);
  if (!context?.lView) {
    if (options?.optional) {
      return null;
    }
    throw new Error(
      `Proto: No LView found for given object: ${instance}. Cannot resolve injector.`,
    );
  }

  const { lView, nodeIndex } = context;
  const tNode = lView[1].data[nodeIndex];

  if (!createInjFn) {
    throw new Error(`Proto: No createInjFn found. Cannot resolve injector.`);
  }

  return createInjFn(tNode, lView);
}

function getLContext(instance: object) {
  try {
    return ɵgetLContext(instance);
  } catch {
    return null;
  }
}
