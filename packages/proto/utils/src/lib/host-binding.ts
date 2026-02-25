import type { EffectRef } from '@angular/core';
import type { ElementInjectorOptions, ListenerOpts } from '@terseware/proto/internal';
import { bindAttr, bindStyle, bindStyles, listener } from '@terseware/proto/internal';

export function hostBinding<const Prop extends string>(
  binding: `attr.${Prop}`,
  value: () => string | null | undefined,
  opts?: ElementInjectorOptions,
): EffectRef;

export function hostBinding<const Prop extends string>(
  binding: `style.${Prop}`,
  value: () => string | null | undefined,
  opts?: ElementInjectorOptions,
): EffectRef;

export function hostBinding(
  binding: 'style',
  value: () => Record<string, string | null | undefined>,
  opts?: ElementInjectorOptions,
): EffectRef;

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
