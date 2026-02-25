/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InjectOptions, Type, TypeDecorator } from '@angular/core';
import { ElementRef, inject, Injector, isDevMode } from '@angular/core';
import type { Exact, OmitNever, Pretty } from '@terseware/proto/internal';
import { injectElement, isObject } from '@terseware/proto/internal';
import type { BindableSignal } from '@terseware/proto/utils';
import { isBindableSignal } from '@terseware/proto/utils';

const RESOLVABLE: unique symbol = Symbol('RESOLVABLE');
const INSTANCE_MAP: unique symbol = Symbol('INSTANCE_MAP');

export type ResolvableOptions = {
  host?: boolean;
  self?: boolean;
  skipSelf?: boolean;
};

const DEFAULT_RESOLVABLE_OPTIONS: Required<ResolvableOptions> = {
  host: false,
  self: false,
  skipSelf: false,
};

export type ResolvableTypeData<T> = Type<T> & { [RESOLVABLE]: Required<ResolvableOptions> };

export type ResolvableInstanceData<T> = {
  type: ResolvableTypeData<T>;
  element: Element;
  injector: Injector;
};

/**
 * Decorator that marks a class as dynamically resolvable via DI or in the DOM tree.
 *
 * @usageNotes
 * Marking a class with @Resolvable provides enhanced functionality
 * to automatically resolve a class instance at the current level of
 * the DOM tree when resolvable criteria are not met.
 */
export function Resolvable(resolvableOpts: ResolvableOptions = {}): TypeDecorator {
  const options = { ...DEFAULT_RESOLVABLE_OPTIONS, ...resolvableOpts };
  return function (base: any) {
    const type = class Wrapper extends base {
      constructor() {
        // eslint-disable-next-line prefer-rest-params
        const arg1 = arguments[0];
        const rOpts: ResolvableOptions = isObject(arg1) ? arg1 : {};
        const existing = inject(type, { ...rOpts, optional: true });
        if (existing) {
          return existing;
        }
        const injector = inject(Injector);
        const element = injectElement();
        const map = getInstanceMap(element);
        super();
        Object.defineProperty(this, RESOLVABLE, {
          value: {
            type: type as unknown as ResolvableTypeData<Wrapper>,
            element,
            injector,
          } satisfies ResolvableInstanceData<Wrapper>,
        });
        map.set(type, this);
      }

      static defaultInject({
        host = options.host,
        self = options.self,
        skipSelf = options.skipSelf,
      }: InjectOptions): Wrapper | null {
        if (self && skipSelf) {
          return null;
        }

        if (self || host) {
          const inj = inject(Injector, { optional: true, self, host });
          return inj ? findInstance(inj, type) : null;
        }

        let inj = inject(Injector, { optional: true, skipSelf });
        while (inj) {
          const instance = findInstance(inj, type);
          if (instance) {
            return instance;
          }
          inj = inj.get(Injector, null, { optional: true, skipSelf: true });
        }

        return null;
      }

      // This is the trick to the dynamic resolution of the class instance.
      static __NG_ELEMENT_ID__ = (flags: number): Wrapper | null =>
        Wrapper.defaultInject({
          optional: !!(flags & 8),
          host: !!(flags & 1),
          self: !!(flags & 2),
          skipSelf: !!(flags & 4),
        });
    };

    Object.defineProperty(type, RESOLVABLE, { value: options });
    Object.defineProperty(type, 'name', { value: base.name });
    return type;
  };
}

export function isResolvable<T>(data: Type<T>): data is ResolvableTypeData<T>;
export function isResolvable<T>(data: T): data is T & ResolvableInstanceData<T>;
export function isResolvable(data: unknown): unknown {
  return (data as any)[RESOLVABLE] !== undefined;
}

export type BindableProps<T> = Pretty<
  Partial<
    OmitNever<{
      [K in keyof T]: T[K] extends BindableSignal<any> ? Parameters<T[K]['set']>[0] : never;
    }>
  >
>;

export function resolve<T, B extends BindableProps<T>>(
  type: Type<T>,
  props: Exact<B, BindableProps<T>> = {} as Exact<B, BindableProps<T>>,
  options: ResolvableOptions = {},
): T {
  if (!isResolvable(type)) {
    throw new Error(`Proto: ${type.name} is not a @Resolvable`);
  }
  const instance = new type({ ...type[RESOLVABLE], ...options });
  return attachBindings(instance, props);
}

export function attachBindings<T, B extends BindableProps<T>>(
  instance: T,
  props: Exact<B, BindableProps<T>>,
): T {
  let bindableSeen = false;
  for (const [key, value] of Object.entries(props ?? {})) {
    const source = (instance as Record<string, unknown>)[key];
    if (isBindableSignal(source)) {
      bindableSeen = true;
      source.set(value);
    }
  }

  if (isDevMode() && !bindableSeen && !isResolvable(instance)) {
    // eslint-disable-next-line no-console
    console.warn(
      'Proto: bindInject or attachBindings called with no bindable signals and an object that is not @Resolvable, this could be a mistake',
      instance,
    );
  }

  return instance;
}

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
