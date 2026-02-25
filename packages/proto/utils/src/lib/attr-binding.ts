import { computed, type EffectRef, inject, Renderer2 } from '@angular/core';
import { injectElementRef } from './element-ref';
import { isomorphicEffect } from './isomorphic';
import { isNull, isUndefined } from './validators';

/**
 * Binds an attribute to a signal.
 * - `undefined` does nothing
 * - `null` removes the attribute
 * - `string` sets the attribute
 */
export function attrBinding(
  binding: `attr.${string}`,
  value: () => string | null | undefined,
): EffectRef {
  const elementRef = injectElementRef();
  const renderer = inject(Renderer2);
  const prop = computed(() => binding.slice(5));
  return isomorphicEffect({
    earlyRead: computed(() => value()),
    write: sourceSig => {
      const source = sourceSig();
      if (!isUndefined(source)) {
        if (isNull(source)) {
          renderer.removeAttribute(elementRef.nativeElement, prop());
        } else {
          renderer.setAttribute(elementRef.nativeElement, prop(), String(source));
        }
      }
    },
  });
}
