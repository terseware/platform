import {
  computed,
  Directive,
  effect,
  inject,
  InjectionToken,
  input,
  runInInjectionContext,
} from '@angular/core';
import type { FieldState, ValidationError } from '@angular/forms/signals';
import { ElementRenderer, injectElement, isString, scoped } from '@terseware/utils';
import { FieldCtx } from './field-ctx';

export type ProtoFieldErrorStrategy<T> =
  | 'onSubmit'
  | 'onBlur'
  | 'onChange'
  | ((state: FieldState<T, string | number>) => boolean);

export const PROTO_FIELD_ERROR_STRATEGY = new InjectionToken<ProtoFieldErrorStrategy<unknown>>(
  'PROTO_FIELD_ERROR_STRATEGY',
  { factory: () => 'onSubmit' },
);

@Directive({
  selector: '[protoFieldError]',
  exportAs: 'protoFieldError',
  host: {
    '[id]': 'id',
    'aria-atomic': 'true',
    'aria-live': 'polite',
    '[attr.aria-hidden]': '!visible() || null',
    '[attr.data-errors-visible]': "visible() ? '' : null",
    '[style.display]': 'visible() ? "" : "none"',
  },
})
export class ProtoFieldError<T> {
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly id = this.#renderer.id(this.element, 'field-error');

  readonly error = input.required<ValidationError.WithFieldTree>({
    alias: 'protoFieldError',
  });
  readonly state = computed(() => this.error().fieldTree() as FieldState<T, string | number>);

  readonly errorStrategy = input<ProtoFieldErrorStrategy<T>>(inject(PROTO_FIELD_ERROR_STRATEGY), {
    alias: 'protoErrorStrategy',
  });

  readonly triedSubmitting = computed(() => {
    for (const field of this.error().fieldTree().formFieldBindings()) {
      const context = runInInjectionContext(field.injector, () => inject(FieldCtx<T>));
      if (context.triedSubmitting()) {
        return true;
      }
    }
    return false;
  });

  readonly visible = computed(() => {
    const strategy = this.errorStrategy();
    if (isString(strategy)) {
      switch (strategy) {
        case 'onBlur':
          return this.state().touched();
        case 'onChange':
          return this.state().dirty();
        default:
          return this.triedSubmitting();
      }
    } else {
      return strategy(this.state());
    }
  });

  constructor() {
    effect(() => {
      for (const field of this.error().fieldTree().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(FieldCtx<T>));
        scoped(() => context.addError(this));
      }
    });
  }
}
