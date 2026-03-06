import {
  computed,
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
import { FieldCtx } from './field-ctx';
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
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #isNativeLabel = inject(HOST_TAG_NAME).toLowerCase() === 'label';

  readonly id = this.#renderer.id(this.#element, 'field-label');
  readonly field = input.required<FieldTree<T, string | number>>({ alias: 'for' });
  readonly state = computed(() => this.field()());

  readonly #for = signal<string | null>(null);
  readonly for = this.#for.asReadonly();

  readonly contexts = computed(() =>
    this.field()()
      .fieldTree()
      .formFieldBindings()
      .map(field => runInInjectionContext(field.injector, () => inject(FieldCtx<T>))),
  );

  constructor() {
    effect(() => {
      const contexts = this.contexts();
      for (const context of contexts) {
        scoped(() => context.addLabel(this));
      }

      const context = contexts[0];
      if (!context) {
        return;
      }

      if (isDevMode() && this.#isNativeLabel && contexts.length > 1) {
        // eslint-disable-next-line no-console
        console.warn('Proto: Multiple field bindings found on a native label', {
          fieldLabel: this,
          contexts,
        });
      }

      this.#for.set(this.#isNativeLabel ? context.id : null);
    });

    installFieldDataAttributes<T>(() => this.state());
    installFieldErrorDataAttributes(() => this.contexts()[0]);
  }
}
