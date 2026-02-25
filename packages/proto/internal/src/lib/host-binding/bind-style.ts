import type { EffectRef } from '@angular/core';
import { computed, inject, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { isomorphicEffect } from '@terseware/proto/utils';
import type { ElementInjectorOptions } from '../run-injector';
import { runInElementInjector } from '../run-injector';
import { isFunction, isNull, isUndefined } from '../validators';

/**
 * Binds a style property to an element.
 * - `undefined` does nothing
 * - `null` removes the style
 * - `string` sets the style
 */
export function bindStyle(
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

/**
 * Binds a set of style properties to an element.
 * - `undefined` does nothing
 * - `null` removes the style
 * - `string` sets the style
 */
export function bindStyles(
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
