/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Injector, Type, TypeDecorator } from '@angular/core';
import {
  inject,
  InjectionToken,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import { getInj, isClass, isFunction } from '@terseware/utils';
import { assertInjector } from 'ngxtension/assert-injector';

const RESOLVABLE = '__TERSEWARE_PROTO_RESOLVABLE__' as const;

export type ResolverOptions<R extends object> = {
  resolveIn: (() => R) | 'host' | 'any';
  fallbackInjector: boolean;
};

type ResolverMetadata<R extends object = object> = {
  baseName: string;
  defaultOptions: ResolverOptions<R>;
};

export function isResolvable<R extends object = object>(
  type: Type<object>,
): type is Type<object> & { [RESOLVABLE]: ResolverMetadata<R> } {
  return isClass(type) && RESOLVABLE in type;
}

export function Resolvable<R extends object = object>(
  options?: Partial<ResolverOptions<R>>,
): TypeDecorator {
  return function (base: any) {
    class Base extends base {
      static [RESOLVABLE]: ResolverMetadata<R> = {
        baseName: base.name,
        defaultOptions: {
          resolveIn: options?.resolveIn ?? 'host',
          fallbackInjector: options?.fallbackInjector ?? false,
        },
      };

      static __NG_ELEMENT_ID__ = (): Base | null => {
        const { resolveIn } = Base[RESOLVABLE].defaultOptions;

        if (isFunction(resolveIn)) {
          const ref = resolveIn();
          const inst = tryGetInstance<R, Base>(ref, Base);
          if (inst) {
            return inst;
          }
        }

        if (resolveIn === 'any') {
          return traverseVcr(inject(ViewContainerRef), Base);
        }

        return tryGetInstance<Element, Base>(inject(ViewContainerRef).element.nativeElement, Base);
      };
    }

    Object.defineProperty(Base, 'name', { value: base.name });
    Object.defineProperty(Base.prototype, Symbol.toStringTag, {
      value: `${base.name}_Resolvable`,
      configurable: true,
    });

    return Base;
  };
}

const EMBEDDED_VIEW_INJECTOR = 20;

function traverseVcr<T extends object>(vcr: ViewContainerRef, type: Type<T>): T | null {
  const instance = tryGetInstance<Element, T>(vcr.element.nativeElement, type);
  if (instance) {
    return instance;
  }

  const emInj = (vcr as any)._hostLView?.[EMBEDDED_VIEW_INJECTOR] as Injector | null;
  if (emInj) {
    const emVcr = runInInjectionContext(emInj, () => inject(ViewContainerRef, { optional: true }));
    if (emVcr) {
      return traverseVcr(emVcr, type);
    }
  }

  const parent = vcr.parentInjector?.get(ViewContainerRef, null);
  if (parent) {
    return traverseVcr(parent, type);
  }

  return null;
}

const INSTANCES = new InjectionToken('RESOLVABLE_INSTANCES', {
  factory: () => new WeakMap<object, Map<Type<object>, object>>(),
});

function getInstancesMap<R extends object, T extends object>(ref: R): Map<Type<T>, T> {
  const weakMap = inject(INSTANCES);
  let iMap = weakMap.get(ref) as Map<Type<T>, T> | undefined;
  if (!iMap) {
    iMap = new Map<Type<T>, T>();
    weakMap.set(ref, iMap);
  }
  return iMap;
}

function tryGetInstance<R extends object, T extends object>(ref: R, type: Type<T>): T | null {
  const map = getInstancesMap<R, T>(ref);
  return map ? (map.has(type) ? (map.get(type) as T) : null) : null;
}

function setInstance<R extends object, T extends object>(ref: R, type: Type<T>, inst: T): T {
  const map = getInstancesMap<R, T>(ref);
  map.set(type, inst);
  return inst;
}

function createInstance<R extends object, T extends object>(
  inj: Injector,
  ref: R,
  type: Type<T>,
): T {
  const inst = untracked(() => runInInjectionContext(inj, () => new type()));
  setInstance<R, T>(ref, type, inst);
  return inst;
}

export function resolve<T extends object, R extends object>(
  type: Type<T>,
  options?: ResolverOptions<R> & { injector?: Injector | null | undefined },
): T {
  if (!isResolvable<R>(type)) {
    throw new Error(`Type ${type.name} is not a resolvable type`);
  }

  return assertInjector(resolve, options?.injector, () => {
    const vcr = inject(ViewContainerRef);

    const { resolveIn, fallbackInjector } = {
      ...type[RESOLVABLE].defaultOptions,
      ...options,
    };

    if (!isFunction(resolveIn)) {
      const el = vcr.element.nativeElement as Element;
      const inst = resolveIn === 'host' ? tryGetInstance(el, type) : traverseVcr(vcr, type);
      return inst ?? createInstance(vcr.injector, el, type);
    }

    const ref = resolveIn();
    const inst = tryGetInstance(ref, type);
    if (inst) {
      return inst;
    }

    let refInj = getInj(ref, { injector: vcr.injector, optional: true });
    if (!refInj && !fallbackInjector) {
      throw new Error(
        `Proto: No injector found for given object: ${ref}. Cannot resolve instance. Consider using fallbackInjector: true.`,
      );
    }

    refInj ??= vcr.injector;
    return runInInjectionContext(refInj, () => createInstance<R, T>(refInj, ref, type));
  });
}
