/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Type, TypeDecorator } from '@angular/core';
import { ElementRef, inject, Injector, runInInjectionContext, untracked } from '@angular/core';
import { injectElement } from '@terseware/utils';

/**
 * Decorator that marks a class as dynamically resolvable via DI or in the DOM tree.
 *
 * @usageNotes
 * Marking a class with @Resolvable provides enhanced functionality
 * to automatically resolve a class instance at the current level of
 * the DOM tree when resolvable criteria are not met.
 */
export function Resolvable(options?: {
  /**
   * Whether to inherit the resolvable instance from the parent injector.
   * - `true`: Resolve the instance from the host or any parent.
   * - `false`: Resolve the instance from the host only.
   * @default false
   */
  inherit?: boolean;
}): TypeDecorator {
  return function (base: any) {
    const type = class Wrapper extends base {
      constructor() {
        const inherit = options?.inherit ?? false;
        const existing = inject(type, { optional: true, host: !inherit });
        if (existing) {
          return existing;
        }
        const element = injectElement();
        const map = getInstanceMap(element);
        super();
        map.set(type, this);
      }

      // This is the trick to the dynamic resolution of the class instance.
      static __NG_ELEMENT_ID__ = (flags: number): Wrapper | null => {
        const { optional, host, self, skipSelf } = {
          optional: !!(flags & 8),
          host: !!(flags & 1),
          self: !!(flags & 2),
          skipSelf: !!(flags & 4),
        };

        if (self || host) {
          const inj = inject(Injector, { optional: true, self, host });
          const instance = inj ? findInstance(inj, type) : null;
          if (instance) {
            return instance;
          }
        } else {
          let inj = inject(Injector, { optional: true, skipSelf });
          while (inj) {
            const instance = findInstance(inj, type);
            if (instance) {
              return instance;
            }
            inj = inj.get(Injector, null, { optional: true, skipSelf: true });
          }
        }

        if (optional) {
          return null;
        }

        const resolvedInj = inject(Injector, { host, self, skipSelf });
        return untracked(() => runInInjectionContext(resolvedInj, () => new type()));
      };
    };

    Object.defineProperty(type, 'name', { value: base.name });
    return type;
  };
}

const INSTANCE_MAP: unique symbol = Symbol('INSTANCE_MAP');

function getInstanceMap<T>(element: Element): Map<Type<T>, T> {
  if (!(element as any)[INSTANCE_MAP]) {
    Object.defineProperty(element, INSTANCE_MAP, { value: new Map() });
  }
  return (element as any)[INSTANCE_MAP] as Map<Type<T>, T>;
}

function findInstance<T>(injEl: Injector, type: Type<T>): T | null {
  const el = injEl.get(ElementRef, null, { optional: true })?.nativeElement as Element | null;
  if (!el) {
    return null;
  }
  const map = getInstanceMap(el);
  if (!map.has(type)) {
    return null;
  }
  return map.get(type) as T;
}
