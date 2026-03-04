import { computed, Directive, effect, inject, input, runInInjectionContext } from '@angular/core';
import type { FieldState, ValidationError } from '@angular/forms/signals';
import { scoped, uniqueId } from '@terseware/utils';
import { ProtoFieldContext } from './field-context';
import type { ProtoFieldErrorStrategy } from './form-di';
import { PROTO_FIELD_ERROR_STRATEGY } from './form-di';

@Directive({
  selector: '[protoFieldError]',
  exportAs: 'protoFieldError',
  host: {
    '[id]': 'id',
    role: 'alert',
    'aria-live': 'polite',
    '[attr.aria-hidden]': '!visible() || null',
    '[attr.data-errors-visible]': "visible() ? '' : null",
    '[style.display]': 'visible() ? "" : "none"',
  },
})
export class ProtoFieldError<T> {
  readonly id = uniqueId('field-error');

  readonly error = input.required<ValidationError.WithFieldTree>({
    alias: 'protoFieldError',
  });
  readonly state = computed(() => this.error().fieldTree() as FieldState<T, string | number>);

  readonly errorStrategy = input<ProtoFieldErrorStrategy<T>>(inject(PROTO_FIELD_ERROR_STRATEGY), {
    alias: 'protoErrorStrategy',
  });
  readonly visible = computed(() => this.errorStrategy()(this.state()));

  constructor() {
    effect(() => {
      for (const field of this.error().fieldTree().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(ProtoFieldContext<T>));
        scoped(() => context.addError(this));
      }
    });
  }
}
