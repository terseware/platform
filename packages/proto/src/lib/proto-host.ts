/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { EffectRef, ListenerOptions, Provider, Type } from '@angular/core';
import {
  inject,
  Injectable,
  Injector,
  NgZone,
  Renderer2,
  RendererStyleFlags2,
  runInInjectionContext,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import { EVENT_MANAGER_PLUGINS, EventManager } from '@angular/platform-browser';
import { isNull, isomorphicEffect, isUndefined, onDestroy, uniqueId } from '@terseware/utils';
import { SignalMap } from 'ngxtension/collections';
import { ProtoResolver } from './proto-resolve';

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
 * Continues the current event pipeline, or dispatches into another channel.
 *
 * @example
 * // Implicit: forward the current named event downstream
 * ctx.on('keydown', ({ event, next }) => { next(event); });
 *
 * // Explicit: cross-channel dispatch into click pipeline
 * ctx.on('keydown', ({ event, next }) => { next.event('click', event); });
 */
export type ProtoNext = {
  (event: ProtoEvent<Event>): void;
  event<K extends keyof HTMLElementEventMap>(
    name: K,
    event: ProtoEvent<HTMLElementEventMap[K] | Event>,
  ): void;
};

/**
 * The context passed to a middleware handler in an event pipeline.
 */
export type ProtoHandlerCtx<E extends Event> = {
  /**
   * The event being handled.
   */
  event: ProtoEvent<E>;
  /**
   * Yields to the next handler in the pipeline with the provided event.
   */
  next: ProtoNext;
};

/**
 * A middleware handler in an event pipeline.
 * Call {@link ProtoNext} to continue; omit it to stop the chain.
 */
export type ProtoEventHandler<E extends Event> = (ctx: ProtoHandlerCtx<E>) => void;

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

@Injectable()
class ProtoEventManager extends EventManager {
  readonly #hosts = new WeakMap<Element, ProtoHost>();

  constructor() {
    super(inject(EVENT_MANAGER_PLUGINS), inject(NgZone));
  }

  registerHost(element: HTMLElement, host: ProtoHost) {
    this.#hosts.set(element, host);
    return {
      remove: () => this.#hosts.delete(element),
      addEventListener: super.addEventListener.bind(this),
    };
  }

  override addEventListener(
    element: HTMLElement,
    eventName: keyof HTMLElementEventMap,
    handler: Function,
    options?: ListenerOptions,
  ): () => void {
    const context = this.#hosts.get(element);
    if (!context) {
      const rm = super.addEventListener(element, eventName, handler, options);
      return () => rm();
    }
    return context.on(eventName, ({ event, next }) => {
      next(event);
      if (!event.protoHandlerPrevented) {
        return handler(event);
      }
    });
  }
}

/**
 * Per-host owner of all {@link Proto} instances, and host attributes, styles, and event pipelines.
 * One instance per DOM element; scoped to the element's view container.
 */
export class ProtoHost {
  readonly #vcr = inject(ViewContainerRef);
  readonly element = this.#vcr.element.nativeElement as HTMLElement;
  readonly #renderer = inject(Renderer2);
  readonly #resolver = inject(ProtoResolver);
  readonly #injector = inject(Injector);
  readonly #events = new SignalMap<string, ProtoEventHandler<Event>[]>();

  static __NG_ELEMENT_ID__ = (): ProtoHost => {
    const vcr = inject(ViewContainerRef);
    const resolver = inject(ProtoResolver);
    return resolver.resolve(ProtoHost, vcr, { inherit: false });
  };

  resolve<T>(type: Type<T>, options?: { inherit?: boolean }): T {
    return this.#resolver.resolve(type, this.#vcr, options);
  }

  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>): T;
  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>, opts?: { optional?: false }): T;
  resolveOnParent<T>(parentToken: Type<unknown>, type: Type<T>, opts: { optional: true }): T | null;
  resolveOnParent<T>(
    parentToken: Type<unknown>,
    type: Type<T>,
    opts?: { optional?: boolean },
  ): T | null {
    return untracked(() => {
      const ref = runInInjectionContext(this.#injector, () =>
        inject(parentToken, { skipSelf: true, optional: opts?.optional ?? false }),
      );
      if (!ref) {
        return null;
      }
      return ProtoResolver.resolve(type, ref);
    });
  }

  constructor() {
    const eventManager = inject(ProtoEventManager, { optional: true });
    if (!eventManager) {
      throw new Error(
        'Proto event manager could not be resolved. Make sure to add provideProto() to your app config.',
      );
    }

    const registration = eventManager.registerHost(this.element, this);
    onDestroy(() => registration.remove());

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
                return theirHandler({ event: protoEvent, next });
              };
            }

            if (merged) {
              rmListeners.push(registration.addEventListener(this.element, eventName, merged));
            }
          }

          onCleanup(() => rmListeners.forEach(unlisten => unlisten()));
        });
      },
    });
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

  setAttrs(attrs: Record<string, string | null | undefined>): void {
    for (const [name, value] of Object.entries(attrs)) {
      this.setAttr(name, value);
    }
  }

  bindAttrs(attrs: Record<string, () => string | null | undefined>): EffectRef {
    const effects: EffectRef[] = [];
    for (const [name, value] of Object.entries(attrs)) {
      effects.push(this.bindAttr(name, value));
    }
    return {
      destroy: () => {
        for (const effect of effects) {
          effect.destroy();
        }
      },
    };
  }

  arrayAttr(
    attr: string,
    value: (string | null | undefined) | (string | null | undefined)[],
  ): () => void {
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
  setStyle(
    style: string,
    value: string | number | null | undefined,
    flags?: RendererStyleFlags2,
  ): void {
    if (!isUndefined(value)) {
      flags ??= style.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
      if (isNull(value)) {
        this.#renderer.removeStyle(this.element, style, flags);
      } else {
        this.#renderer.setStyle(this.element, style, String(value), flags);
      }
    }
  }

  bindStyle(style: string, value: () => string | number | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value() as string | null | undefined,
        write: v => this.setStyle(style, v()),
      },
      { injector: this.#injector },
    );
  }

  /** Sets multiple styles at once. */
  setStyles(styles: Record<string, string | number | null | undefined>): void {
    for (const [key, value] of Object.entries(styles)) {
      this.setStyle(key, value);
    }
  }

  bindStyles(styles: () => Record<string, string | number | null | undefined>): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => styles(),
        write: s => this.setStyles(s()),
      },
      { injector: this.#injector },
    );
  }

  docEvent<K extends keyof DocumentEventMap>(
    eventName: K,
    handler: (event: DocumentEventMap[K]) => void,
    options?: ListenerOptions,
  ): () => void {
    const unlisten = this.#renderer.listen('document', eventName, handler, options);
    return () => unlisten();
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
        handler({ event: evt as ProtoEvent<Event>, next });
      };
    }

    pipeline?.(event);
  }
}

/**
 * Wires {@link ProtoHost} into Angular's event system.
 * Required at the root to enable {@link ProtoEvent} and {@link preventProtoHandler}.
 */
export function provideProtoHost(): Provider {
  return [ProtoEventManager, { provide: EventManager, useExisting: ProtoEventManager }];
}
