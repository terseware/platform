import { Directive, effect, inject, input, runInInjectionContext } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ElementRenderer, injectElement, scoped } from '@terseware/utils';
import { FieldCtx } from './field-ctx';

@Directive({
  selector: '[protoFieldDescription]',
  exportAs: 'protoFieldDescription',
  host: {
    '[id]': 'id',
  },
})
export class ProtoFieldDescription<T> {
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly id = this.#renderer.id(this.element, 'field-description');

  readonly field = input.required<FieldTree<T, string | number>>({
    alias: 'protoFieldDescription',
  });

  constructor() {
    effect(() => {
      for (const field of this.field()().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(FieldCtx<T>));
        scoped(() => context.addDescription(this));
      }
    });
  }
}
