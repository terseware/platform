import { computed, inject, signal } from '@angular/core';
import { FORM_FIELD, FormRoot } from '@angular/forms/signals';
import { ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { HoverProto } from '@terseware/proto/hover';
import { injectElement, isNode } from '@terseware/utils';
import { installFieldDataAttributes } from './forms-di';

@Resolvable()
export class FormProto<T> {
  readonly #host = inject(ProtoHost);
  readonly formRoot = inject(FormRoot<T>);

  readonly state = computed(() => this.formRoot.fieldTree()());
  readonly element = injectElement();

  readonly #triedSubmitting = signal(false);
  readonly triedSubmitting = this.#triedSubmitting.asReadonly();

  constructor() {
    resolve(HoverProto);
    // Don't install data attributes if the root element is also a form field
    // since form fields are already installed with data attributes
    if (!inject(FORM_FIELD, { optional: true, host: true })) {
      installFieldDataAttributes(this.#host.element, () => this.state().fieldTree());
    }

    this.#host.docEvent('submit', event => {
      const triedSubmit = isNode(event.target) && event.target.contains(this.element);
      if (triedSubmit) {
        this.#triedSubmitting.set(true);
        if (this.state().invalid()) {
          this.state().focusBoundControl();
        }
      }
    });
  }
}
