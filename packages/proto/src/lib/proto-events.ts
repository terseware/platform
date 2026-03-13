/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { Injector, ListenerOptions, Provider } from '@angular/core';
import { inject, Injectable, NgZone, ViewContainerRef } from '@angular/core';
import { EVENT_MANAGER_PLUGINS, EventManager } from '@angular/platform-browser';
import { isomorphicEffect, onDestroy } from '@terseware/utils';
import { assertInjector } from 'ngxtension/assert-injector';
import { SignalMap } from 'ngxtension/collections';
import { ProtoHost } from './proto-host';
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

export type ProtoNext = {
  (event: ProtoEvent<Event>): void;
  event<K extends keyof HTMLElementEventMap>(
    name: K,
    event: ProtoEvent<HTMLElementEventMap[K] | Event>,
  ): void;
};

export type ProtoHandlerCtx<E extends Event> = {
  event: ProtoEvent<E>;
  next: ProtoNext;
};

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

  Object.defineProperties(event, {
    __protoEvent: { value: true },
    preventProtoHandler: {
      value() {
        Object.defineProperty(event, 'protoHandlerPrevented', {
          value: true,
          configurable: true,
        });
      },
    },
  });

  return event as ProtoEvent<E>;
}

function buildPipeline(
  handlers: ProtoEventHandler<Event>[],
  eventName: string,
  dispatch: (name: string, event: ProtoEvent<Event>) => void,
): (event: Event) => void {
  let pipeline: ((event: Event) => void) | null = null;

  for (let i = handlers.length - 1; i >= 0; i--) {
    const handler = handlers[i];
    const downstream = pipeline;

    pipeline = (evt: Event) => {
      const protoEvent = toProtoEvent(evt);

      const nextImplicit = (e: ProtoEvent<Event>) => {
        if (!protoEvent.protoHandlerPrevented) {
          downstream?.(e);
        }
      };

      const nextExplicit = {
        event: (name: string, e: ProtoEvent<Event>) => {
          if (protoEvent.protoHandlerPrevented) return;
          if (name === eventName) {
            downstream?.(e);
          } else {
            dispatch(name, e);
          }
        },
      };

      handler?.({ event: protoEvent, next: Object.assign(nextImplicit, nextExplicit) });
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return pipeline!;
}

@Injectable()
class ProtoEventManager extends EventManager {
  readonly #hosts = new WeakMap<Element, ProtoEvents>();

  constructor() {
    super(inject(EVENT_MANAGER_PLUGINS), inject(NgZone));
  }

  registerHost(element: HTMLElement, events: ProtoEvents) {
    this.#hosts.set(element, events);
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
  ): Function {
    const events = this.#hosts.get(element);
    if (!events) {
      return super.addEventListener(element, eventName, handler, options);
    }

    return events.on(eventName, ({ event, next }) => {
      next(event);
      if (!event.protoHandlerPrevented) {
        handler(event);
      }
    });
  }
}

/**
 * Per-element event pipeline. Owns handler registration, pipeline compilation,
 * and cross-channel dispatch.
 */
export class ProtoEvents {
  readonly #host = inject(ProtoHost);
  readonly #handlers = new SignalMap<string, ProtoEventHandler<Event>[]>();

  static __NG_ELEMENT_ID__ = (): ProtoEvents =>
    inject(ProtoResolver).resolve(ProtoEvents, inject(ViewContainerRef));

  constructor() {
    const eventManager = inject(ProtoEventManager, { optional: true });
    if (!eventManager) {
      throw new Error('ProtoEventManager not found. Add provideProtoEvents() to your app config.');
    }

    const registration = eventManager.registerHost(this.#host.element, this);
    onDestroy(() => registration.remove());

    // Recompile pipelines when handlers change and bind DOM listeners
    isomorphicEffect({
      write: onCleanup => {
        const entries = this.#handlers.entries();

        const rmListeners: (() => void)[] = [];

        for (const [eventName, handlers] of entries) {
          if (!handlers.length) continue;

          const pipeline = buildPipeline(handlers, eventName, (name, event) =>
            this.#dispatch(name, event),
          );

          const rm = registration.addEventListener(this.#host.element, eventName, pipeline);
          rmListeners.push(() => rm());
        }

        onCleanup(() => rmListeners.forEach(rm => rm()));
      },
    });
  }

  /**
   * Registers a middleware handler for {@link eventName}.
   * First-registered-outermost — earlier registrations wrap later ones.
   * @returns Teardown function.
   */
  on<K extends keyof HTMLElementEventMap>(
    eventName: K,
    handler: ProtoEventHandler<HTMLElementEventMap[K]>,
  ): () => void {
    const hFn = handler as unknown as ProtoEventHandler<Event>;
    const current = this.#handlers.get(eventName) ?? [];
    this.#handlers.set(eventName, [...current, hFn]);

    return () => {
      const handlers = this.#handlers.get(eventName);
      if (handlers) {
        this.#handlers.set(
          eventName,
          handlers.filter(h => h !== hFn),
        );
      }
    };
  }

  #dispatch(name: string, event: ProtoEvent<Event>): void {
    const handlers = this.#handlers.get(name);
    if (!handlers?.length) return;
    const pipeline = buildPipeline(handlers, name, (n, e) => this.#dispatch(n, e));
    pipeline(event);
  }
}

/**
 * Registers a middleware handler for {@link eventName} using {@link ProtoEvents.on}.
 * First-registered-outermost — earlier registrations wrap later ones.
 * @returns Teardown function.
 */
export function on<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: ProtoEventHandler<HTMLElementEventMap[K]>,
  options?: { injector?: Injector | undefined },
): () => void {
  return assertInjector(on, options?.injector, () => inject(ProtoEvents).on(eventName, handler));
}

/**
 * Wires {@link ProtoEvents} into Angular's event system.
 */
export function provideProtoEvents(): Provider {
  return [ProtoEventManager, { provide: EventManager, useExisting: ProtoEventManager }];
}
