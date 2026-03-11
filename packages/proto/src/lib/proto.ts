/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { EffectRef, ListenerOptions, Provider, Type } from '@angular/core';
import {
  inject,
  Injectable,
  InjectionToken,
  Injector,
  NgZone,
  Renderer2,
  RendererStyleFlags2,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
  ɵgetLContext,
} from '@angular/core';
import { EVENT_MANAGER_PLUGINS, EventManager } from '@angular/platform-browser';
import {
  disposable,
  injectElement,
  injectorFallback,
  isNull,
  isomorphicEffect,
  isUndefined,
  SignalWeakMap,
  uniqueId,
} from '@terseware/utils';
import { SignalMap } from 'ngxtension/collections';

/**
 * An {@link Event} augmented by the proto pipeline.
 * Carries {@link ProtoEvent.preventProtoHandler} to short-circuit downstream handlers.
 */
export type ProtoEvent<E extends Event> = E & {
  readonly __protoEvent: true;
  preventProtoHandler(): void;
  readonly protoHandlerPrevented?: boolean | undefined;
};

/**
 * A middleware handler in an event pipeline.
 * Call {@link ProtoNext} to continue; omit it to stop the chain.
 */
export type ProtoEventHandler<E extends Event> = (event: ProtoEvent<E>, next: ProtoNext) => void;

/**
 * Continues the current event pipeline, or dispatches into another channel.
 *
 * @example
 * // Implicit: forward the current named event downstream
 * ctx.on('keydown', (event, next) => { next(event); });
 *
 * // Explicit: cross-channel dispatch into click pipeline
 * ctx.on('keydown', (event, next) => { next.event('click', event); });
 */
export type ProtoNext = {
  (event: ProtoEvent<Event>): void;
  event<K extends keyof HTMLElementEventMap>(
    name: K,
    event: ProtoEvent<HTMLElementEventMap[K] | Event>,
  ): void;
};

const PROTO_HOSTS = new InjectionToken('PROTO_HOSTS', {
  factory: () => new SignalWeakMap<Element, ProtoHost>(),
});

export function isProtoEvent<E extends Event>(event: E): event is ProtoEvent<E>;
export function isProtoEvent(event: unknown): event is ProtoEvent<Event>;
export function isProtoEvent(event: unknown): event is ProtoEvent<Event> {
  return event instanceof Event && '__protoEvent' in event;
}

function toProtoEvent<E extends Event>(event: E): ProtoEvent<E> {
  if (isProtoEvent(event)) {
    return event;
  }
  Object.defineProperty(event, '__protoEvent', { value: true, configurable: false });
  Object.defineProperty(event, 'preventProtoHandler', {
    value: () => {
      Object.defineProperty(event, 'protoHandlerPrevented', {
        value: true,
        configurable: true,
        writable: false,
      });
    },
    configurable: false,
  });
  return event as ProtoEvent<E>;
}

let createInjFn: ((tNode: any, lView: any) => Injector) | null = null;

function setCreateElInjFn(injector: Injector): void {
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

function getElementInjector(element: Element): Injector {
  const context = getLContext(element);

  if (!context?.lView) {
    throw new Error(`Proto: No LView found for given object: ${element}. Cannot resolve injector.`);
  }

  if (!createInjFn) {
    throw new Error(`Proto: No createInjFn found. Cannot resolve injector.`);
  }

  const { lView, nodeIndex } = context;
  const tNode = lView[1].data[nodeIndex];
  return createInjFn(tNode, lView);
}

function getLContext(instance: object) {
  try {
    return ɵgetLContext(instance);
  } catch {
    return null;
  }
}

/**
 * Per-element owner of all {@link Behavior} instances and event pipelines.
 * One instance per DOM element.
 */
export class ProtoHost {
  readonly #vcr = inject(ViewContainerRef);
  readonly element = this.#vcr.element.nativeElement as HTMLElement;
  readonly #eventManager: ProtoEventManager;
  readonly #renderer = inject(Renderer2);
  readonly #injector = inject(Injector);
  readonly #events = new SignalMap<string, ProtoEventHandler<Event>[]>();
  readonly #protoInstances = new WeakMap<Type<unknown>, unknown>();

  static for<T>(element: Element, type: Type<T>): T;
  static for(element: Element): ProtoHost;
  static for<T>(element: Element, type?: Type<T>): ProtoHost | T {
    const inj = getElementInjector(element);
    const contexts = inj.get(PROTO_HOSTS);
    let instance = contexts.get(element);
    if (!instance) {
      instance = untracked(() => runInInjectionContext(inj, () => new ProtoHost()));
      contexts.set(element, instance);
    }
    return type ? instance.resolve<T>(type) : instance;
  }

  protected static __NG_ELEMENT_ID__ = (): ProtoHost => {
    const element = injectElement();
    const contexts = inject(PROTO_HOSTS);
    setCreateElInjFn(inject(Injector));
    let instance = contexts.get(element);
    if (!instance) {
      instance = new ProtoHost();
      contexts.set(element, instance);
    }
    return instance;
  };

  /**
   * Returns the {@link Behavior} instance for {@link type} scoped to this element.
   * Creates it on first access.
   */
  resolve<T>(type: Type<T>): T {
    let instance = this.#protoInstances.get(type) as T | undefined;
    if (!instance) {
      instance = untracked(() => runInInjectionContext(this.#injector, () => new type()));
      this.#protoInstances.set(type, instance);
    }
    return instance;
  }

  id(prefix?: string): string {
    return this.element.id
      ? this.element.id
      : (this.element.id = uniqueId(prefix || 'element', this.#injector));
  }

  setAttr(name: string, value: string | null | undefined): void {
    if (!isUndefined(value)) {
      if (isNull(value)) {
        this.#renderer.removeAttribute(this.element, name);
      } else {
        this.#renderer.setAttribute(this.element, name, String(value));
      }
    }
  }

  arrayAttr(
    attr: string,
    value: (string | null | undefined) | (string | null | undefined)[],
    injector?: Injector | null | undefined,
  ): () => void {
    return disposable(this.arrayAttr, injectorFallback(injector, this.#injector), () => {
      const values = (Array.isArray(value) ? value : [value])
        .map(v => v?.trim() || null)
        .filter(Boolean);

      const getFn = () => new Set(this.element.getAttribute(attr)?.split(' ').filter(Boolean));
      const setFn = (set: Set<string>) => (set.size ? [...set].join(' ') : null);

      let set = getFn();
      values.forEach(v => v && set.add(v));
      this.setAttr(attr, setFn(set));

      return () => {
        set = getFn();
        values.forEach(v => v && set.delete(v));
        this.setAttr(attr, setFn(set));
      };
    });
  }

  bindAttr(attr: string, value: () => string | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value(),
        write: v => this.setAttr(attr, v()),
      },
      { injector: this.#injector },
    );
  }

  /**
   * Sets or removes a style. `null` removes it; `undefined` is a no-op.
   * CSS custom properties (`--*`) are applied with {@link RendererStyleFlags2.DashCase}
   * unless {@link flags} is provided.
   */
  setStyle(style: string, value: string | null | undefined, flags?: RendererStyleFlags2): void {
    if (!isUndefined(value)) {
      flags ??= style.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
      if (isNull(value)) {
        this.#renderer.removeStyle(this.element, style, flags);
      } else {
        this.#renderer.setStyle(this.element, style, String(value), flags);
      }
    }
  }

  bindStyle(style: string, value: () => string | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value() as string | null | undefined,
        write: v => this.setStyle(style, v()),
      },
      { injector: this.#injector },
    );
  }

  /** Sets multiple styles at once. */
  setStyles(styles: Record<string, string | null | undefined>): void {
    for (const [key, value] of Object.entries(styles)) {
      this.setStyle(key, value);
    }
  }

  bindStyles(styles: () => Record<string, string | null | undefined>): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => styles(),
        write: s => this.setStyles(s()),
      },
      { injector: this.#injector },
    );
  }

  /**
   * Registers a middleware handler for {@link eventName} on this element.
   * Handlers run first-registered-outermost — earlier registrations wrap later ones.
   * @returns Teardown that removes the handler.
   */
  on<K extends keyof HTMLElementEventMap>(
    eventName: K,
    handler: ProtoEventHandler<HTMLElementEventMap[K]>,
  ): () => void {
    const handlers = this.#events.get(eventName) ?? [];
    const hFn = handler as unknown as ProtoEventHandler<Event>;
    handlers.push(hFn);
    this.#events.set(eventName, handlers);
    return () => {
      const removed = this.#events.get(eventName) ?? [];
      this.#events.set(
        eventName,
        removed.filter(h => h !== hFn),
      );
    };
  }

  /**
   * Returns the {@link Behavior} instance for {@link type} scoped to this element's parent.
   * @returns The instance, or null if not found.
   */
  findInParent<T>(type: Type<T>): T | null {
    return this.#traverseVcr(this.#vcr, type);
  }

  #traverseVcr<T>(vcr: ViewContainerRef, type: Type<T>): T | null {
    const instance = this.#protoInstances.get(type) as T | undefined;
    if (instance) {
      return instance;
    }

    const inj = (vcr as any)._hostLView?.[20] as Injector | null;
    if (inj) {
      const v = runInInjectionContext(inj, () => inject(ViewContainerRef, { optional: true }));
      if (v) {
        return this.#traverseVcr(v, type);
      }
    }

    const parent = vcr.parentInjector?.get(ViewContainerRef, null);
    if (parent) {
      return this.#traverseVcr(parent, type);
    }

    return null;
  }

  constructor() {
    const eventManager = inject(ProtoEventManager, { optional: true });
    if (!eventManager) {
      throw new Error(
        'Proto event manager could not be resolved. Make sure to add provideProto() to your app config.',
      );
    }
    this.#eventManager = eventManager;

    isomorphicEffect({
      write: onCleanup => {
        const entries = this.#events.entries();

        untracked(() => {
          const rmListeners: Function[] = [];

          for (const [eventName, handlers] of entries) {
            if (!handlers.length) {
              continue;
            }

            let merged: ((event: Event) => void) | null = null;

            for (const theirHandler of handlers.reverse()) {
              const ourHandler = merged;
              merged = (event: Event) => {
                const protoEvent = toProtoEvent(event);

                const nextImplicit = (e: ProtoEvent<Event>) => {
                  if (!protoEvent.protoHandlerPrevented) {
                    return ourHandler?.(e);
                  }
                };

                const nextExplicit = {
                  event: <K extends keyof HTMLElementEventMap>(
                    name: K,
                    e: ProtoEvent<HTMLElementEventMap[K]>,
                  ) => {
                    if (!protoEvent.protoHandlerPrevented) {
                      if (name === eventName) {
                        return ourHandler?.(e); // same channel: walk down this pipeline
                      } else {
                        return this.#dispatch(name, e); // cross-channel: dispatch into that event's full pipeline
                      }
                    }
                  },
                };

                const next: ProtoNext = Object.assign(nextImplicit, nextExplicit);
                return theirHandler(protoEvent, next);
              };
            }

            if (merged) {
              rmListeners.push(
                this.#eventManager.originalAddEventListener(this.element, eventName, merged),
              );
            }
          }

          onCleanup(() => rmListeners.forEach(unlisten => unlisten()));
        });
      },
    });
  }

  #dispatch<K extends keyof HTMLElementEventMap>(
    name: K,
    event: ProtoEvent<HTMLElementEventMap[K]>,
  ): void {
    const handlers = this.#events.get(name) ?? [];
    if (!handlers.length) {
      return;
    }

    let pipeline: ((event: Event) => void) | null = null;
    for (const handler of handlers.reverse()) {
      const downstream = pipeline;
      pipeline = (evt: Event) => {
        const nextImplicit = (e: ProtoEvent<Event>) => {
          return downstream?.(e);
        };

        const nextExplicit = {
          event: (n: string, e: ProtoEvent<Event>) => {
            if (n === (name as string)) {
              return downstream?.(e);
            }
            return this.#dispatch(n as keyof HTMLElementEventMap, e);
          },
        };

        const next: ProtoNext = Object.assign(nextImplicit, nextExplicit);
        handler(evt as ProtoEvent<Event>, next);
      };
    }

    pipeline?.(event);
  }
}

@Injectable()
class ProtoEventManager extends EventManager {
  readonly #contexts = inject(PROTO_HOSTS);

  constructor() {
    super(inject(EVENT_MANAGER_PLUGINS), inject(NgZone));
  }

  originalAddEventListener(
    element: HTMLElement,
    eventName: string,
    handler: Function,
    options?: ListenerOptions,
  ): Function {
    return super.addEventListener(element, eventName, handler, options);
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: Function,
    options?: ListenerOptions,
  ): Function {
    const context = this.#contexts.get(element);
    if (!context) {
      return super.addEventListener(element, eventName, handler, options);
    }

    const eName = eventName as keyof HTMLElementEventMap;
    return context.on(eName, (event, next) => {
      next(event);
      if (!event.protoHandlerPrevented) {
        return handler(event);
      }
    });
  }
}

/**
 * Marks a class as an element-scoped behavior resolvable via Angular DI.
 * Instances are created once per element through {@link ProtoHost.resolve}.
 */
export function Behavior() {
  return function <T extends Type<object>>(target: T): T {
    class Base extends target {
      static __NG_ELEMENT_ID__ = (flags: number): Base | null => {
        const host = inject(ProtoHost);
        const skipSelf = !!(flags & 4);
        if (skipSelf) {
          return host.findInParent(Base);
        }
        return host.resolve(Base);
      };
    }

    Object.defineProperty(Base, 'name', { value: target.name });
    Object.defineProperty(Base.prototype, Symbol.toStringTag, {
      value: `${target.name}_Behavior`,
      configurable: true,
    });

    return Base;
  };
}

/**
 * Wires {@link ProtoHost} into Angular's event system.
 * Required at the root to enable {@link ProtoEvent} and {@link preventProtoHandler}.
 */
export function provideProto(): Provider {
  return [ProtoEventManager, { provide: EventManager, useExisting: ProtoEventManager }];
}
