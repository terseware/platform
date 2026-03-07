import {
  computed,
  Directive,
  effect,
  inject,
  Injector,
  input,
  runInInjectionContext,
} from '@angular/core';
import type { FieldState, ValidationError } from '@angular/forms/signals';
import { ElementRenderer, injectElement, runInScope } from '@terseware/utils';
import { FieldCtx } from './field-ctx';
import { installFieldDataAttributes, installFieldErrorDataAttributes } from './forms-di';

@Directive({
  selector: '[protoFieldError]',
  exportAs: 'protoFieldError',
  host: {
    '[id]': 'id',
    'aria-atomic': 'true',
    'aria-live': 'polite',
    '[attr.aria-hidden]': "visible() ? null : 'true'",
    '[attr.data-errors-visible]': "visible() ? '' : null",
    '[style.display]': "visible() ? '' : 'none'",
  },
})
export class ProtoFieldError<T> {
  readonly #injector = inject(Injector);
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly id = this.#renderer.id(this.#element, 'field-error');
  readonly error = input.required<ValidationError.WithFieldTree>({
    alias: 'protoFieldError',
  });
  readonly state = computed(() => this.error().fieldTree() as FieldState<T, string | number>);

  readonly contexts = computed(() => {
    return this.error()
      .fieldTree()
      .formFieldBindings()
      .map(field => runInInjectionContext(field.injector, () => inject(FieldCtx<T>)));
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

  readonly visible = computed(() => this.contexts().some(context => context.errorsVisible()));

  constructor() {
    effect(onCleanup => {
      for (const context of this.contexts()) {
        runInScope(this.#injector, onCleanup, () => context.addError(this));
      }
    });

    installFieldDataAttributes<T>(() => this.state());
    installFieldErrorDataAttributes(() => this.contexts()[0]);
  }
}
