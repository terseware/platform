import {
  Directive,
  effect,
  HOST_TAG_NAME,
  inject,
  input,
  isDevMode,
  runInInjectionContext,
  signal,
} from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ElementRenderer, injectElement, scoped } from '@terseware/utils';
import { FieldContext } from './field-context';

@Directive({
  selector: '[protoFieldLabel]',
  exportAs: 'protoFieldLabel',
  host: {
    '[id]': 'id',
    '[attr.for]': 'for()',
  },
})
export class ProtoFieldLabel<T> {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly isNativeLabel = inject(HOST_TAG_NAME).toLowerCase() === 'label';

  readonly field = input.required<FieldTree<T, string | number>>({ alias: 'for' });

  readonly id = this.#renderer.id(this.#element, 'field-label');
  readonly #for = signal<string | null>(null);
  readonly for = this.#for.asReadonly();

  constructor() {
    effect(() => {
      const bindings = this.field()().formFieldBindings();
      const field = bindings[0];
      if (!field) {
        return;
      }

      if (isDevMode() && this.isNativeLabel && bindings.length > 1) {
        // eslint-disable-next-line no-console
        console.warn('Proto: Multiple field bindings found on a native label', {
          fieldLabel: this,
          bindings,
        });
      }

      const context = runInInjectionContext(field.injector, () => inject(FieldContext<T>));
      scoped(() => context.addLabel(this));
      this.isNativeLabel && this.#for.set(context.id);
    });
  }
}
