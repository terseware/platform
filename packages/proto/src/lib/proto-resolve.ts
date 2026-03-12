/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InjectOptions, Injector, Type } from '@angular/core';
import {
  inject,
  Injectable,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
  ɵgetLContext,
} from '@angular/core';
import { isClass, isObject } from '@terseware/utils';

export type ResolvableOptions = {
  explicit: boolean;
  inherit: boolean;
};

const defaultResolvableOptions: ResolvableOptions = {
  inherit: false,
  explicit: false,
};

const PROTO_RESOLVABLE = '__PROTO_RESOLVABLE__' as const;

export type ResolvableType<T> = Type<T> & {
  [PROTO_RESOLVABLE]: {
    options: ResolvableOptions;
  };
};

export function isResolvableType<T>(type: Type<T>): type is ResolvableType<T> {
  return isClass(type) && isObject((type as any)?.[PROTO_RESOLVABLE]);
}

export function Resolvable(opts?: Partial<ResolvableOptions>) {
  return function <T extends Type<object>>(target: T): T {
    const options: ResolvableOptions = { ...defaultResolvableOptions, ...opts };

    class R extends target {
      static [PROTO_RESOLVABLE]: ResolvableType<T>[typeof PROTO_RESOLVABLE] = {
        options,
      };

      static __NG_ELEMENT_ID__ = (flags_: number): R | null => {
        const vcr = inject(ViewContainerRef);
        const resolver = inject(ProtoResolver);
        const { host, skipSelf } = flagsToInjectOptions(flags_);

        const inherit = options.inherit || skipSelf;
        const create = !options.explicit || host;

        const existing = inherit ? resolver.traverse(R, vcr) : resolver.get(R, vcr);
        return existing ?? (create ? resolver.resolve(R, vcr) : null);
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

function flagsToInjectOptions(flags: number): Required<InjectOptions> {
  return {
    optional: !!(flags & 8),
    skipSelf: !!(flags & 4),
    self: !!(flags & 2),
    host: !!(flags & 1),
  };
}

@Injectable({ providedIn: 'root' })
export class ProtoResolver {
  readonly #resolvers = new WeakMap<Element, Map<Type<unknown>, unknown>>();

  #getResolvers<T>(vcr: ViewContainerRef): Map<Type<T>, T> {
    let resolvers = this.#resolvers.get(vcr.element.nativeElement);
    if (!resolvers) {
      resolvers = new Map();
      this.#resolvers.set(vcr.element.nativeElement, resolvers);
    }
    return resolvers as Map<Type<T>, T>;
  }

  static resolve<T>(type: Type<T>, reference: object, options?: { inherit?: boolean }): T {
    return untracked(() => {
      const inj = borrowedNodeInjector(reference);
      const vcr = runInInjectionContext(inj, () => inject(ViewContainerRef));
      const inherit = options?.inherit ?? getResolvableOptions(type).inherit;
      return inj.get(ProtoResolver).resolve(type, vcr, { inherit });
    });
  }

  resolve<T>(type: Type<T>, vcr: ViewContainerRef, options?: { inherit?: boolean }): T {
    setCreateNodeInjFn(vcr);
    return untracked(() => {
      const inherit = options?.inherit ?? getResolvableOptions(type).inherit;
      let instance = inherit ? this.traverse(type, vcr) : this.get(type, vcr);
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

function getResolvableOptions<T>(type: Type<T>): ResolvableOptions {
  return isResolvableType(type) ? type[PROTO_RESOLVABLE].options : defaultResolvableOptions;
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

function borrowedNodeInjector(obj: object): Injector {
  const context = ɵgetLContext(obj);

  if (!context?.lView) {
    throw new Error(`Proto: No LView found for given object: ${obj}. Cannot resolve injector.`);
  }

  if (!createNodeInjFn) {
    throw new Error(`Proto: No createNodeInjFn found. Cannot resolve injector.`);
  }

  const { lView, nodeIndex } = context;
  const tNode = lView[1].data[nodeIndex];
  return createNodeInjFn(tNode, lView);
}
