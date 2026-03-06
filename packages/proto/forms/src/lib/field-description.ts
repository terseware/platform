import { computed, Directive, effect, inject, input, runInInjectionContext } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ElementRenderer, injectElement, isomorphicEffect, scoped } from '@terseware/utils';
import { FieldCtx } from './field-ctx';
import { FormCtx } from './form-ctx';

@Directive({
  selector: '[protoFieldDescription]',
  exportAs: 'protoFieldDescription',
  host: {
    '[id]': 'id',
  },
})
export class ProtoFieldDescription<T> {
  readonly #formCtx = inject(FormCtx<T>);
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly id = this.#renderer.id(this.#element, 'field-description');
  readonly field = input.required<FieldTree<T, string | number>>({
    alias: 'protoFieldDescription',
  });
  readonly state = computed(() => this.field()());

  constructor() {
    effect(() => {
      for (const field of this.field()().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(FieldCtx<T>));
        scoped(() => context.addDescription(this));
      }
    });

    for (const [attribute, condition] of Object.entries(this.#formCtx.dataAttributes)) {
      isomorphicEffect({
        write: () => {
          this.#renderer.setAttr(this.#element, attribute, condition(this.state()) ? '' : null);
        },
      });
    }
  }
}
