import type { ListenerOptions } from '@angular/core';
import { inject, Injector, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { disposable, injectorFallback } from './dispose';
import { uniqueId } from './unique-id';
import { isNull, isUndefined } from './validators';

type GlobalEventTarget = 'window' | 'document' | 'body';

type TargetEventMap<T> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
      ? HTMLElementEventMap
      : T extends Element
        ? ElementEventMap
        : never;

type GlobalEventMap<T extends GlobalEventTarget> = T extends 'window'
  ? WindowEventMap
  : T extends 'document'
    ? DocumentEventMap
    : T extends 'body'
      ? HTMLBodyElementEventMap
      : never;

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

export class ElementRenderer {
  readonly #injector = inject(Injector);
  readonly #renderer = inject(Renderer2);

  static __NG_ELEMENT_ID__ = (): ElementRenderer => new ElementRenderer();

  id(el: Element, prefix?: string): string {
    return el.id ? el.id : (el.id = uniqueId(prefix || 'element', this.#injector));
  }

  /**
   * Sets or removes an attribute. `null` removes it; `undefined` is a no-op.
   * Skips the DOM write if the cached value matches.
   */
  setAttr<E extends Element>(el: E, name: string, value: string | null | undefined): void {
    if (!isUndefined(value)) {
      if (isNull(value)) {
        this.#renderer.removeAttribute(el, name);
      } else {
        this.#renderer.setAttribute(el, name, String(value));
      }
    }
  }

  disposableAttr<E extends Element>(
    el: E,
    attr: string,
    value: (string | null | undefined) | (string | null | undefined)[],
    injector?: Injector | null | undefined,
  ): () => void {
    return disposable(this.disposableAttr, injectorFallback(injector, this.#injector), () => {
      const values = (Array.isArray(value) ? value : [value])
        .map(v => v?.trim() || null)
        .filter(Boolean);

      const getFn = () => new Set(el.getAttribute(attr)?.split(' ').filter(Boolean));
      const setFn = (set: Set<string>) => (set.size ? [...set].join(' ') : null);

      let set = getFn();
      values.forEach(v => v && set.add(v));
      this.setAttr(el, attr, setFn(set));

      return () => {
        set = getFn();
        values.forEach(v => v && set.delete(v));
        this.setAttr(el, attr, setFn(set));
      };
    });
  }

  /**
   * Sets or removes a style. `null` removes it; `undefined` is a no-op.
   * CSS custom properties (`--*`) are applied with {@link RendererStyleFlags2.DashCase}.
   */
  setStyle<E extends Element, const K extends keyof CSSStyles & string>(
    el: E,
    style: K,
    value: CSSPropertyValue<K> | null | undefined,
  ): void {
    if (!isUndefined(value)) {
      const flags = style.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
      if (isNull(value)) {
        this.#renderer.removeStyle(el, style, flags);
      } else {
        this.#renderer.setStyle(el, style, String(value), flags);
      }
    }
  }

  /** Sets multiple styles at once. */
  styles<E extends Element>(
    el: E,
    styles: { [K in keyof CSSStyles & string]?: CSSPropertyValue<K> | null | undefined },
  ): void {
    for (const [key, value] of Object.entries(styles)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.setStyle(el, key as any, value);
    }
  }

  /** Sets a DOM property directly. Skips the write if the cached value matches. */
  prop<E extends Element, const K extends string>(
    el: E,
    name: K,
    value: K extends keyof E ? E[K] : never,
  ): void {
    this.#renderer.setProperty(el, name, value);
  }

  // Overloads for global string targets
  listen<T extends GlobalEventTarget, K extends keyof GlobalEventMap<T> & string>(
    target: T,
    eventName: K,
    callback: (event: GlobalEventMap<T>[K]) => boolean | void,
    options?: ListenerOptions & { injector?: Injector | null | undefined },
  ): () => void;
  listen<T extends Window | Document | Element, K extends keyof TargetEventMap<T> & string>(
    target: T,
    eventName: K,
    callback: (event: TargetEventMap<T>[K]) => boolean | void,
    options?: ListenerOptions & { injector?: Injector | null | undefined },
  ): () => void;
  listen(
    target: GlobalEventTarget | Window | Document | Element,
    eventName: string,
    callback: (event: Event) => boolean | void,
    options?: ListenerOptions & { injector?: Injector | null | undefined },
  ): () => void;
  listen(
    target: GlobalEventTarget | Window | Document | Element,
    eventName: string,
    callback: (event: Event) => boolean | void,
    options?: ListenerOptions & { injector?: Injector | null | undefined },
  ): () => void {
    return disposable(this.listen, injectorFallback(options?.injector, this.#injector), () => {
      const unlisten = this.#renderer.listen(target, eventName, callback, options);
      return () => unlisten();
    });
  }
}
