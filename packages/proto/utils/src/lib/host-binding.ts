import type { EffectRef } from '@angular/core';
import { computed, DOCUMENT, inject, Renderer2, RendererStyleFlags2 } from '@angular/core';
import type { ElementInjectorOptions } from '@terseware/proto/internal';
import {
  isBoolean,
  isFunction,
  isNull,
  isUndefined,
  onDestroy,
  runInElementInjector,
} from '@terseware/proto/internal';
import { isomorphicEffect } from './isomorphic';

/**
 * Binds an attribute to host element or specified element.
 * - `undefined` does nothing
 * - `null` removes the attribute
 * - `string` sets the attribute
 */
export function hostBinding<const Prop extends string>(
  binding: `attr.${Prop}`,
  value: () => string | null | undefined,
  opts?: ElementInjectorOptions,
): EffectRef;

/**
 * Binds a set of style properties to host element or specified element.
 * - `undefined` does nothing
 * - `null` removes the style
 * - `string` sets the style
 */
export function hostBinding<const Prop extends string>(
  binding: `style.${Prop}`,
  value: () => string | null | undefined,
  opts?: ElementInjectorOptions,
): EffectRef;

/**
 * Binds a set of style properties to host element or specified element.
 * - `undefined` does nothing
 * - `null` removes the style
 * - `string` sets the style
 */
export function hostBinding(
  binding: 'style',
  value: () => Record<string, string | null | undefined>,
  opts?: ElementInjectorOptions,
): EffectRef;

/**
 * Binds a listener to host element, specified element, or document.
 */
export function hostBinding<const Prop extends keyof HTMLElementEventMap>(
  binding: `(${Prop})`,
  handler: (event: HTMLElementEventMap[Prop]) => void,
  opts?: ListenerOpts,
): EffectRef;

export function hostBinding(
  binding: `attr.${string}` | `style.${string}` | 'style' | `(${string})`,
  value:
    | ((event: HTMLElementEventMap[keyof HTMLElementEventMap]) => void)
    | (() => string | null | undefined)
    | (() => Record<string, string | null | undefined>),
  opts?: ListenerOpts,
): EffectRef {
  if (binding.startsWith('attr.')) {
    return bindAttr(binding.slice(5), value as () => string | null | undefined, opts);
  }
  if (binding === 'style') {
    return bindStyles(value as () => Record<string, string | null | undefined>, opts);
  }
  if (binding.startsWith('style.')) {
    return bindStyle(binding.slice(6), value as () => string | null | undefined, opts);
  }
  if (binding.startsWith('(')) {
    return {
      destroy: listener(
        binding.slice(1, -1) as keyof HTMLElementEventMap,
        value as (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => void,
        opts,
      ),
    };
  }
  throw new Error(`Invalid binding: ${binding}`);
}

function bindAttr(
  binding: string,
  value: () => string | null | undefined,
  opts: ElementInjectorOptions = {},
): EffectRef {
  return runInElementInjector(bindAttr, opts, ({ element }) => {
    const renderer = inject(Renderer2);
    return isomorphicEffect({
      earlyRead: computed(() => (isFunction(value) ? value() : value)),
      write: source => {
        const val = source();
        if (!isUndefined(val)) {
          if (isNull(val)) {
            renderer.removeAttribute(element, binding);
          } else {
            renderer.setAttribute(element, binding, String(val));
          }
        }
      },
    });
  });
}

function bindStyle(
  binding: string,
  value: () => string | null | undefined,
  opts: ElementInjectorOptions = {},
): EffectRef {
  return runInElementInjector(bindStyle, opts, ({ element }) => {
    const renderer = inject(Renderer2);
    return isomorphicEffect({
      earlyRead: computed(() => (isFunction(value) ? value() : value)),
      write: sourceSig => {
        const val = sourceSig();
        applyStyle(renderer, element, binding, val);
      },
    });
  });
}

function bindStyles(
  value: () => Record<string, string | null | undefined>,
  opts: ElementInjectorOptions = {},
): EffectRef {
  return runInElementInjector(bindStyle, opts, ({ element }) => {
    const renderer = inject(Renderer2);
    return isomorphicEffect({
      earlyRead: computed(() => (isFunction(value) ? value() : value), {
        equal: (a, b) => {
          const aKeys = Object.keys(a);
          return aKeys.length === Object.keys(b).length && aKeys.every(k => a[k] === b[k]);
        },
      }),
      write: sourceSig => {
        const source = sourceSig();
        for (const [prop, val] of Object.entries(source)) {
          applyStyle(renderer, element, prop, val);
        }
      },
    });
  });
}

function applyStyle(
  renderer: Renderer2,
  element: HTMLElement,
  prop: string,
  value: string | null | undefined,
): void {
  if (isUndefined(value)) {
    return;
  }
  const flags = prop.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
  if (isNull(value)) {
    renderer.removeStyle(element, prop, flags);
  } else {
    renderer.setStyle(element, prop, String(value), flags);
  }
}

export type ListenerOpts =
  | (ElementInjectorOptions & {
      document: true;
      element?: undefined;
      config?: AddEventListenerOptions | boolean | null | undefined;
    })
  | (ElementInjectorOptions & {
      document?: false;
      config?: AddEventListenerOptions | boolean | null | undefined;
    });

/**
 * Binds a listener to an element
 */
export function listener<const K extends keyof HTMLElementEventMap>(
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: ListenerOpts,
): () => void {
  return runInElementInjector(listener, options, ({ element }) => {
    const renderer = inject(Renderer2);
    const config = options?.config;
    const rmListen = renderer.listen(
      options?.document ? inject(DOCUMENT) : element,
      event,
      handler,
      isBoolean(config)
        ? { capture: true }
        : {
            ...config,
            // Default to capture if document unless otherwise specified
            capture: config?.capture ?? options?.document === true,
          },
    );
    const rmDestroy = onDestroy(() => rmListen());
    return () => {
      rmListen();
      rmDestroy();
    };
  });
}
