import type { Injector } from '@angular/core';
import { DOCUMENT, inject, signal } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { Resolvable, RESOLVABLE_REF } from '@terseware/proto';
import { disposable, ElementRenderer, injectElement, isNode } from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { FieldCtx } from './field-ctx';
import { installFieldDataAttributes } from './forms-di';
import { getRootFieldState } from './forms-utils';

@Resolvable({ ref: () => getRootFieldState(inject(FORM_FIELD).state()) })
export class FormCtx<T> {
  readonly state = inject<FieldState<T>>(RESOLVABLE_REF);
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
    if (!inject(FORM_FIELD, { optional: true, host: true })) {
      // Don't install data attributes if the root element is also a form field
      // since form fields are already installed with data attributes
      installFieldDataAttributes(() => this.state);
    }

    this.#renderer.listen(
      inject(DOCUMENT),
      'submit',
      event => {
        const triedSubmit = isNode(event.target) && event.target.contains(this.element);
        if (triedSubmit) {
          this.#triedSubmitting.set(true);
          if (this.state.invalid()) {
            this.state.focusBoundControl();
          }
        }
      },
      { capture: true },
    );
  }
}
