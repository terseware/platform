import type { EffectRef } from '@angular/core';
import { inject, InjectionToken } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { ProtoHost, ProtoResolver } from '@terseware/proto';
import { isFunction, isNil } from '@terseware/utils';
import type { FieldProto } from './field.proto';
import type { FormProto } from './form.proto';

export type ProtoFormDataAttributes<T = unknown> = Record<
  string,
  (state: FieldState<T>) => boolean
>;

export const PROTO_FORM_DATA_ATTRIBUTES = new InjectionToken<ProtoFormDataAttributes<unknown>>(
  'PROTO_FORM_DATA_ATTRIBUTES',
  {
    factory: () => ({
      'data-disabled': state => state.disabled(),
      'data-dirty': state => state.dirty(),
      'data-filled': state =>
        !!state.formFieldBindings().length && !isNil(state.value()) && state.value() !== '',
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
  state: () => FieldState<T> | null | undefined,
  options?: { dataAttributes?: ProtoFormDataAttributes<T> | null | undefined },
): EffectRef {
  const host = ProtoResolver.resolve(ProtoHost, element);
  const dataAttributes = options?.dataAttributes ?? inject(PROTO_FORM_DATA_ATTRIBUTES);
  return host.bindAttrs(
    Object.fromEntries(
      Object.entries(dataAttributes).map(([attribute, condition]) => [
        attribute,
        () => {
          const s = state();
          return s ? (condition(s) ? '' : null) : null;
        },
      ]),
    ),
  );
}

export type ProtoFieldErrorStrategy<T> =
  | 'onSubmit'
  | 'onBlur'
  | 'onChange'
  | ((state: FieldState<T, string | number>) => boolean);

export const PROTO_FIELD_ERROR_STRATEGY = new InjectionToken<ProtoFieldErrorStrategy<unknown>>(
  'PROTO_FIELD_ERROR_STRATEGY',
  { factory: () => 'onSubmit' },
);

export function shouldFieldErrorsBeVisible<T>(
  strategy: ProtoFieldErrorStrategy<T>,
  state: FieldState<T>,
  formCtx: FormProto<T>,
): boolean {
  if (isFunction(strategy)) {
    return strategy(state);
  }
  switch (strategy) {
    case 'onBlur':
      return state.invalid() && state.touched();
    case 'onChange':
      return state.invalid() && state.dirty();
  }
  return state.invalid() && formCtx.triedSubmitting();
}

export function installFieldErrorDataAttributes<T>(
  element: Element,
  fieldCtx: () => FieldProto<T> | null | undefined,
): EffectRef {
  const host = ProtoResolver.resolve(ProtoHost, element);
  return host.bindAttr('data-errors-visible', () => {
    const ctx = fieldCtx();
    return ctx ? (ctx.errorsVisible() ? '' : null) : null;
  });
}
