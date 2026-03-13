import {
  computed,
  Directive,
  effect,
  HOST_TAG_NAME,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ProtoHost, ProtoResolver } from '@terseware/proto';
import { FieldProto } from './field.proto';
import { installFieldDataAttributes, installFieldErrorDataAttributes } from './forms-di';

@Directive({
  selector: '[protoFieldLabel]',
  exportAs: 'protoFieldLabel',
  host: {
    '[id]': 'id',
    '[attr.for]': 'for()',
  },
})
export class ProtoFieldLabel<T> {
  readonly #host = inject(ProtoHost);
  readonly #isNativeLabel = inject(HOST_TAG_NAME).toLowerCase() === 'label';

  readonly id = this.#host.id('field-label');
  readonly field = input.required<FieldTree<T, string | number>>({ alias: 'for' });
  readonly state = computed(() => this.field()());

  readonly #for = signal<string | null>(null);
  readonly for = this.#for.asReadonly();

  constructor() {
    const contexts = computed(() =>
      this.state()
        .formFieldBindings()
        .map(field => ProtoResolver.resolve(FieldProto<T>, field.element)),
    );

    installFieldDataAttributes<T>(this.#host.element, () => this.state());
    installFieldErrorDataAttributes(this.#host.element, () => contexts()[0]);

    effect(() => {
      const ctx = contexts()[0];
      if (ctx) {
        this.#for.set(this.#isNativeLabel ? ctx.id : null);
      }

      if (isDevMode() && this.#isNativeLabel && contexts.length > 1) {
        // eslint-disable-next-line no-console
        console.warn('Proto: Multiple field bindings found on a native label', {
          fieldLabel: this,
          contexts,
        });
      }
    });

    effect(onCleanup => {
      for (const field of this.state().formFieldBindings()) {
        const host = ProtoResolver.resolve(ProtoHost, field.element);
        const removeAttr = host.arrayAttr('aria-labelledby', this.id);
        onCleanup(() => removeAttr());
      }
    });
  }
}
