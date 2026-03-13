/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Injector, Type } from '@angular/core';
import {
  inject,
  Injectable,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
  ɵgetLContext,
} from '@angular/core';
import { isClass, isObject, uniqueId } from '@terseware/utils';
import { assertInjector } from 'ngxtension/assert-injector';

const PROTO_RESOLVABLE_TYPE = '__PROTO_RESOLVABLE_TYPE__' as const;
export type ResolvableType<T> = Type<T> & {
  [PROTO_RESOLVABLE_TYPE]: {
    name: string;
  };
};

export function isResolvableType<T>(type: Type<T>): type is ResolvableType<T> {
  return isClass(type) && (type as any)?.[PROTO_RESOLVABLE_TYPE] !== undefined;
}

const PROTO_RESOLVABLE = '__PROTO_RESOLVABLE__' as const;
export type Resolvable<T> = {
  [PROTO_RESOLVABLE]: {
    instanceId: string;
    resolvableType: ResolvableType<T>;
  };
};

export function isResolvable(type: unknown): type is Resolvable<unknown> {
  return isObject(type) && (type as any)?.[PROTO_RESOLVABLE] !== undefined;
}

export function Resolvable() {
  return function <T extends Type<object>>(target: T): T {
    class R extends target {
      static readonly [PROTO_RESOLVABLE_TYPE]: ResolvableType<T>[typeof PROTO_RESOLVABLE_TYPE] = {
        name: target.name,
      };

      readonly [PROTO_RESOLVABLE]: Resolvable<T>[typeof PROTO_RESOLVABLE] = {
        instanceId: uniqueId(target.name),
        resolvableType: R as unknown as ResolvableType<T>,
      };

      static __NG_ELEMENT_ID__ = (flags: number): R | null => {
        const host = !!(flags & 1);
        const vcr = inject(ViewContainerRef);
        setCreateNodeInjFn(vcr);
        const resolver = inject(ProtoResolver);
        return host ? resolver.get(R, vcr) : resolver.traverse(R, vcr);
      };
    }

    Object.defineProperty(R, 'name', { value: target.name });
    Object.defineProperty(R.prototype, Symbol.toStringTag, {
      value: `${target.name}_Resolvable`,
      configurable: true,
    });

    return R as unknown as T;
  };
}

export function resolve<T>(type: Type<T>, options?: { injector?: Injector | undefined }): T {
  return assertInjector(resolve, options?.injector, () => {
    return (
      inject(type, { host: true, optional: true }) ??
      inject(ProtoResolver).resolve(type, inject(ViewContainerRef))
    );
  });
}

@Injectable({ providedIn: 'root' })
export class ProtoResolver {
  readonly #resolvers = new WeakMap<Element, Map<Type<unknown>, unknown>>();

  #getResolvers<T>(element: ViewContainerRef): Map<Type<T>, T> {
    let resolvers = this.#resolvers.get(element.element.nativeElement);
    if (!resolvers) {
      resolvers = new Map();
      this.#resolvers.set(element.element.nativeElement, resolvers);
    }
    return resolvers as Map<Type<T>, T>;
  }

  getResolvables<T>(element: Element): ReadonlyMap<Type<T>, T> {
    let resolvers = this.#resolvers.get(element);
    if (!resolvers) {
      resolvers = new Map();
      this.#resolvers.set(element, resolvers);
    }
    return Object.freeze(resolvers) as ReadonlyMap<Type<T>, T>;
  }

  static resolve<T>(type: Type<T>, target: Node | InstanceType<any>): T {
    return untracked(() => {
      const inj = borrowedNodeInjector(target);
      const vcr = runInInjectionContext(inj, () => inject(ViewContainerRef));
      return inj.get(ProtoResolver).resolve(type, vcr);
    });
  }

  resolve<T>(type: Type<T>, vcr: ViewContainerRef): T {
    setCreateNodeInjFn(vcr);
    return untracked(() => {
      let instance = this.get(type, vcr);
      if (!instance) {
        instance = runInInjectionContext(vcr.injector, () => new type());
        this.#getResolvers<T>(vcr).set(type, instance);
      }
      return instance;
    });
  }

  get<T>(type: Type<T>, vcr: ViewContainerRef): T | null {
    setCreateNodeInjFn(vcr);
    return this.#getResolvers<T>(vcr).get(type) ?? null;
  }

  traverse<T>(type: Type<T>, vcr: ViewContainerRef): T | null {
    setCreateNodeInjFn(vcr);
    const instance = this.get(type, vcr);
    if (instance) {
      return instance;
    }

    const inj = (vcr as any)._hostLView?.[20] as Injector | null;
    if (inj) {
      const v = runInInjectionContext(inj, () => inject(ViewContainerRef, { optional: true }));
      if (v) {
        return this.traverse(type, v);
      }
    }

    const parent = vcr.parentInjector?.get(ViewContainerRef, null);
    if (parent) {
      return this.traverse(type, parent);
    }

    return null;
  }
}

let createNodeInjFn: ((tNode: any, lView: any) => Injector) | null = null;

function setCreateNodeInjFn(vcr: ViewContainerRef): void {
  if (createNodeInjFn) {
    return;
  }

  const inj = Object.getPrototypeOf(vcr.injector);
  createNodeInjFn = (tNode, lView) => {
    const nodeInj = Object.create(inj);
    nodeInj._tNode = tNode;
    nodeInj._lView = lView;
    return nodeInj;
  };
}

function borrowedNodeInjector(target: Node | InstanceType<any>): Injector {
  const context = ɵgetLContext(target);

  if (!context?.lView) {
    throw new Error(`Proto: No LView found for given object: ${target}. Cannot resolve injector.`);
  }

  if (!createNodeInjFn) {
    throw new Error(`Proto: No createNodeInjFn found. Cannot resolve injector.`);
  }

  const { lView, nodeIndex } = context;
  const tNode = lView[1].data[nodeIndex];
  return createNodeInjFn(tNode, lView);
}
