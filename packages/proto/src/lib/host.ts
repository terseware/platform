/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { EffectRef, ListenerOptions, Provider } from '@angular/core';
import {
  inject,
  Injectable,
  Injector,
  NgZone,
  Renderer2,
  RendererStyleFlags2,
  untracked,
} from '@angular/core';
import { EVENT_MANAGER_PLUGINS, EventManager } from '@angular/platform-browser';
import {
  disposable,
  injectElement,
  injectorFallback,
  isNull,
  isomorphicEffect,
  isUndefined,
  onDestroy,
  uniqueId,
} from '@terseware/utils';
import { SignalMap } from 'ngxtension/collections';
import { Resolvable } from './resolvable';

export type ProtoEvent<E extends Event> = E & {
  readonly __protoEvent: true;
  preventProtoHandler(): void;
  readonly protoHandlerPrevented?: boolean | undefined;
};

export type ProtoEventHandler<E extends Event> = (
  next: (event: ProtoEvent<E>) => unknown,
  event: ProtoEvent<E>,
) => void;

type CSSStyles = CSSStyleDeclaration & {
  anchorName: string;
  positionAnchor: string;
  positionArea: string;
  positionTryFallbacks: string;
};

type CSSPropertyValue<K extends string> = K extends keyof CSSStyles
  ? CSSStyles[K] extends string
    ? CSSStyles[K]
    : string
  : string;

@Resolvable()
export class Host {
  readonly #injector = inject(Injector);
  readonly #renderer = inject(Renderer2);
  readonly element = injectElement();
  readonly #events = new SignalMap<string, ProtoEventHandler<Event>[]>();

  id(prefix?: string): string {
    return this.element.id
      ? this.element.id
      : (this.element.id = uniqueId(prefix || 'element', this.#injector));
  }

  /**
   * Sets or removes an attribute. `null` removes it; `undefined` is a no-op.
   * Skips the DOM write if the cached value matches.
   */
  setAttr(name: string, value: string | null | undefined): void {
    if (!isUndefined(value)) {
      if (isNull(value)) {
        this.#renderer.removeAttribute(this.element, name);
      } else {
        this.#renderer.setAttribute(this.element, name, String(value));
      }
    }
  }

  bindAttr(name: string, value: () => string | null | undefined): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value(),
        write: v => this.setAttr(name, v()),
      },
      { injector: this.#injector },
    );
  }

  disposableAttr(
    attr: string,
    value: (string | null | undefined) | (string | null | undefined)[],
    injector?: Injector | null | undefined,
  ): () => void {
    return disposable(this.disposableAttr, injectorFallback(injector, this.#injector), () => {
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

  /**
   * Sets or removes a style. `null` removes it; `undefined` is a no-op.
   * CSS custom properties (`--*`) are applied with {@link RendererStyleFlags2.DashCase}.
   */
  setStyle<const K extends keyof CSSStyles & string>(
    style: K,
    value: CSSPropertyValue<K> | null | undefined,
  ): void {
    if (!isUndefined(value)) {
      const flags = style.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
      if (isNull(value)) {
        this.#renderer.removeStyle(this.element, style, flags);
      } else {
        this.#renderer.setStyle(this.element, style, String(value), flags);
      }
    }
  }

  bindStyle<const K extends keyof CSSStyles & string>(
    style: K,
    value: () => CSSPropertyValue<K> | null | undefined,
  ): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => value() as string | null | undefined,
        write: v => this.setStyle(style as keyof CSSStyles & string, v()),
      },
      { injector: this.#injector },
    );
  }

  /** Sets multiple styles at once. */
  setStyles(styles: {
    [K in keyof CSSStyles & string]?: CSSPropertyValue<K> | null | undefined;
  }): void {
    for (const [key, value] of Object.entries(styles)) {
      this.setStyle(key as keyof CSSStyles & string, value);
    }
  }

  bindStyles(
    styles: () => {
      [K in keyof CSSStyles & string]?: CSSPropertyValue<K> | null | undefined;
    },
  ): EffectRef {
    return isomorphicEffect(
      {
        earlyRead: () => styles(),
        write: s => this.setStyles(s()),
      },
      { injector: this.#injector },
    );
  }

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

  constructor() {
    const eventManager = inject(ProtoEventManager);
    const registration = eventManager.register(this);
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

                const next = (e: ProtoEvent<Event>) => {
                  if (!protoEvent.protoHandlerPrevented) {
                    return ourHandler?.(e);
                  }
                };

                return theirHandler(next, protoEvent);
              };
            }

            if (merged) {
              const unlisten = registration.addEventListener(this.element, eventName, merged);
              rmListeners.push(unlisten);
            }
          }

          onCleanup(() => {
            for (const unlisten of rmListeners) {
              unlisten();
            }
          });
        });
      },
    });
  }
}

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
export class ProtoEventManager extends EventManager {
  readonly #hosts = new WeakMap<Element, Host>();

  constructor() {
    super(inject(EVENT_MANAGER_PLUGINS), inject(NgZone));
  }

  register(host: Host) {
    this.#hosts.set(host.element, host);
    return {
      remove: () => this.#hosts.delete(host.element),
      addEventListener: this.#baseAddEventListener.bind(this),
    };
  }

  #baseAddEventListener(
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
    const host = this.#hosts.get(element);
    if (host) {
      return host.on(eventName as keyof HTMLElementEventMap, (next, event) => {
        next(event);
        if (!event.protoHandlerPrevented) {
          return handler(event);
        }
      });
    }

    return super.addEventListener(element, eventName, handler, options);
  }
}

export function provideProto(): Provider {
  return [ProtoEventManager, { provide: EventManager, useExisting: ProtoEventManager }];
}
