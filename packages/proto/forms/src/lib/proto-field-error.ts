import { computed, Directive, effect, inject, input, runInInjectionContext } from '@angular/core';
import type { FieldState, ValidationError } from '@angular/forms/signals';
import { ProtoHost, ProtoResolver } from '@terseware/proto';
import { FieldProto } from './field.proto';
import { installFieldDataAttributes } from './forms-di';

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
  readonly #host = inject(ProtoHost);

  readonly id = this.#host.id('field-error');
  readonly error = input.required<ValidationError.WithFieldTree>({
    alias: 'protoFieldError',
  });
  readonly state = computed(() => this.error().fieldTree() as FieldState<T, string | number>);

  readonly contexts = computed(() =>
    this.state()
      .formFieldBindings()
      .map(field => ProtoResolver.resolve(FieldProto<T>, field.element)),
  );

  readonly triedSubmitting = computed(() => {
    for (const field of this.error().fieldTree().formFieldBindings()) {
      const context = runInInjectionContext(field.injector, () => inject(FieldProto<T>));
      if (context.triedSubmitting()) {
        return true;
      }
    }
    return false;
  });

  readonly visible = computed(() => this.contexts().some(context => context.errorsVisible()));

  constructor() {
    installFieldDataAttributes<T>(this.#host.element, () => this.state());

    effect(onCleanup => {
      for (const field of this.state().formFieldBindings()) {
        const host = ProtoResolver.resolve(ProtoHost, field.element);
        const removeAttr = host.arrayAttr('aria-describedby', this.id);
        onCleanup(() => removeAttr());
      }
    });
  }
}
