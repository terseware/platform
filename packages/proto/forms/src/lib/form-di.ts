import type { Injector } from '@angular/core';
import { inject, InjectionToken } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { ElementRenderer, isomorphicEffect, unwrap } from '@terseware/utils';
import { assertInjector } from 'ngxtension/assert-injector';

export type ProtoFieldErrorStrategy<T> = (state: FieldState<T, string | number>) => boolean;

export const PROTO_FIELD_ERROR_STRATEGY = new InjectionToken<ProtoFieldErrorStrategy<unknown>>(
  'PROTO_FIELD_ERROR_STRATEGY',
  { factory: () => state => state.touched() && state.invalid() },
);

export type ProtoFieldDataAttributes<T> = Record<string, (state: FieldState<T>) => boolean>;

export const PROTO_FIELD_DATA_ATTRIBUTES = new InjectionToken<ProtoFieldDataAttributes<unknown>>(
  'PROTO_FIELD_DATA_ATTRIBUTES',
  {
    factory: () => ({
      'data-dirty': state => state.dirty(),
      'data-disabled': state => state.disabled(),
      'data-invalid': state => state.invalid(),
      'data-pending': state => state.pending(),
      'data-pristine': state => !state.dirty(),
      'data-readonly': state => state.readonly(),
      'data-required': state => state.required(),
      'data-touched': state => state.touched(),
      'data-valid': state => state.valid(),
    }),
  },
);

export function installFieldDataAttributes<T>(
  element: Element,
  state: FieldState<T> | (() => FieldState<T>),
  injector?: Injector | null | undefined,
): void {
  assertInjector(installFieldDataAttributes, injector, () => {
    const renderer = inject(ElementRenderer);
    const attr = inject(PROTO_FIELD_DATA_ATTRIBUTES);
    for (const [attribute, condition] of Object.entries(attr)) {
      isomorphicEffect({
        write: () => renderer.setAttr(element, attribute, condition(unwrap(state)) ? '' : null),
      });
    }
  });
}
