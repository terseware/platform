import { Directive, effect, inject, input, runInInjectionContext } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { scoped, uniqueId } from '@terseware/utils';
import { FieldContext } from './field-context';

@Directive({
  selector: '[protoFieldDescription]',
  exportAs: 'protoFieldDescription',
  host: {
    '[id]': 'id',
  },
})
export class ProtoFieldDescription<T> {
  readonly id = uniqueId('field-description');

  readonly field = input.required<FieldTree<T, string | number>>({
    alias: 'protoFieldDescription',
  });

  constructor() {
    effect(() => {
      for (const field of this.field()().formFieldBindings()) {
        const context = runInInjectionContext(field.injector, () => inject(FieldContext<T>));
        scoped(() => context.addDescription(this));
      }
    });
  }
}
