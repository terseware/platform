import type { Injector } from '@angular/core';
import { inject, InjectionToken } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import {
  ElementRenderer,
  injectElement,
  isFunction,
  isNil,
  isomorphicEffect,
} from '@terseware/utils';
import { assertInjector } from 'ngxtension/assert-injector';
import type { FieldCtx } from './field-ctx';
import type { FormCtx } from './form-ctx';

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
  state: () => FieldState<T> | null | undefined,
  options?: {
    dataAttributes?: ProtoFormDataAttributes<T> | null | undefined;
    injector?: Injector | null | undefined;
    element?: Element | null | undefined;
  },
): void {
  return assertInjector(installFieldDataAttributes, options?.injector, () => {
    const renderer = inject(ElementRenderer);
    const dataAttributes = options?.dataAttributes ?? inject(PROTO_FORM_DATA_ATTRIBUTES);
    const element = options?.element ?? injectElement();
    for (const [attribute, condition] of Object.entries(dataAttributes)) {
      isomorphicEffect({
        write: () => {
          const st = state();
          if (st) {
            renderer.setAttr(element, attribute, condition(st) ? '' : null);
          }
        },
      });
    }
  });
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
  formCtx: FormCtx<T>,
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
  fieldCtx: () => FieldCtx<T> | null | undefined,
  options?: {
    injector?: Injector | null | undefined;
    element?: Element | null | undefined;
  },
): void {
  return assertInjector(installFieldDataAttributes, options?.injector, () => {
    const renderer = inject(ElementRenderer);
    const element = options?.element ?? injectElement();
    isomorphicEffect({
      write: () => {
        const ctx = fieldCtx();
        if (ctx) {
          renderer.setAttr(element, 'data-errors-visible', ctx.errorsVisible() ? '' : null);
        }
      },
    });
  });
}
