import { computed, Directive, effect, inject, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ProtoHost, ProtoResolver } from '@terseware/proto';
import { installFieldDataAttributes } from './forms-di';

@Directive({
  selector: '[protoFieldDescription]',
  exportAs: 'protoFieldDescription',
  host: {
    '[id]': 'id',
  },
})
export class ProtoFieldDescription<T> {
  readonly #host = inject(ProtoHost);

  readonly id = this.#host.id('field-description');
  readonly field = input.required<FieldTree<T, string | number>>({
    alias: 'protoFieldDescription',
  });
  readonly state = computed(() => this.field()());

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
