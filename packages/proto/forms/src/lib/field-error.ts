import { Directive, effect, inject, input, runInInjectionContext, signal } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';
import { scoped, uniqueId } from '@terseware/utils';
import { FieldContext } from './field-context';

@Directive({
  selector: '[protoFieldError]',
  exportAs: 'protoFieldError',
  host: {
    '[id]': 'id',
    role: 'alert',
    'aria-live': 'polite',
  },
})
export class ProtoFieldError<T> {
  readonly id = uniqueId('field-error');

  readonly error = input.required<ValidationError.WithFieldTree>({
    alias: 'protoFieldError',
  });

  readonly test = signal(0);

  constructor() {
    effect(() => {
      for (const field of this.error().fieldTree().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(FieldContext<T>));
        scoped(() => context.addError(this));
      }
    });
  }
}
