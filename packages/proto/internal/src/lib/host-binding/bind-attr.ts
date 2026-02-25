import type { EffectRef } from '@angular/core';
import { computed, inject, Renderer2 } from '@angular/core';
import { isomorphicEffect } from '@terseware/proto/utils';
import type { ElementInjectorOptions } from '../run-injector';
import { runInElementInjector } from '../run-injector';
import { isFunction, isNull, isUndefined } from '../validators';

/**
 * Binds an attribute to an element.
 * - `undefined` does nothing
 * - `null` removes the attribute
 * - `string` sets the attribute
 */
export function bindAttr(
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
