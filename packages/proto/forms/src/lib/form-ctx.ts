import { computed, DOCUMENT, inject, Injector, runInInjectionContext, signal } from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD, FormRoot } from '@angular/forms/signals';
import { Resolvable } from '@terseware/proto';
import { disposable, ElementRenderer, injectElement, isNode, onDestroy } from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { FieldCtx } from './field-ctx';
import { installFieldDataAttributes } from './forms-di';

@Resolvable({ resolveIn: () => inject(FormRoot, { optional: true }) ?? inject(FORM_FIELD) })
export class FormCtx<T> {
  readonly #injector = inject(Injector);
  readonly formRoot = computed(() =>
    runInInjectionContext(
      this.#injector,
      () =>
        inject(FormRoot<T>, { optional: true })?.fieldTree() ??
        inject<FormField<T>>(FORM_FIELD).field()().fieldTree,
    ),
  );

  readonly state = computed(() => this.formRoot()());
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly #triedSubmitting = signal(false);
  readonly triedSubmitting = this.#triedSubmitting.asReadonly();

  readonly #fieldCtxs = new SignalSet<FieldCtx<T>>();
  addFieldCtx(fieldCtx: FieldCtx<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addFieldCtx, injector, () => {
      this.#fieldCtxs.add(fieldCtx);
      return () => this.#fieldCtxs.delete(fieldCtx);
    });
  }

  constructor() {
    console.log('BOK');
    // Don't install data attributes if the root element is also a form field
    // since form fields are already installed with data attributes
    if (!inject(FORM_FIELD, { optional: true, host: true })) {
      installFieldDataAttributes(() => this.state());
    }

    onDestroy(() => {
      console.log('BOK44');
    });

    this.#renderer.listen(
      inject(DOCUMENT),
      'submit',
      event => {
        console.log(event.target);
        const triedSubmit = isNode(event.target) && event.target.contains(this.element);
        if (triedSubmit) {
          this.#triedSubmitting.set(true);
          if (this.state().invalid()) {
            this.state().focusBoundControl();
          }
        }
      },
      { capture: true },
    );

    console.log(this.element);
  }
}
