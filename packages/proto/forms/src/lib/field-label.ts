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
import { ElementRenderer, injectElement, isomorphicEffect, scoped } from '@terseware/utils';
import { FieldCtx } from './field-ctx';
import { FormCtx } from './form-ctx';

@Directive({
  selector: '[protoFieldLabel]',
  exportAs: 'protoFieldLabel',
  host: {
    '[id]': 'id',
    '[attr.for]': 'for()',
  },
})
export class ProtoFieldLabel<T> {
  readonly #formCtx = inject(FormCtx<T>);
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);
  readonly #isNativeLabel = inject(HOST_TAG_NAME).toLowerCase() === 'label';

  readonly id = this.#renderer.id(this.#element, 'field-label');
  readonly field = input.required<FieldTree<T, string | number>>({ alias: 'for' });
  readonly state = computed(() => this.field()());

  readonly #for = signal<string | null>(null);
  readonly for = this.#for.asReadonly();

  constructor() {
    effect(() => {
      const bindings = this.field()().formFieldBindings();
      const field = bindings[0];
      if (!field) {
        return;
      }

      if (isDevMode() && this.#isNativeLabel && bindings.length > 1) {
        // eslint-disable-next-line no-console
        console.warn('Proto: Multiple field bindings found on a native label', {
          fieldLabel: this,
          bindings,
        });
      }

      const context = runInInjectionContext(field.injector, () => inject(FieldCtx<T>));
      scoped(() => context.addLabel(this));
      this.#for.set(this.#isNativeLabel ? context.id : null);
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
