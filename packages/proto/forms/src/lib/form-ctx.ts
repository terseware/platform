import { DOCUMENT, inject, signal } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { FORM_FIELD, FormRoot } from '@angular/forms/signals';
import { Resolvable, RESOLVABLE_REF } from '@terseware/proto';
import { ElementRenderer, injectElement, isNode } from '@terseware/utils';
import { getRootFieldState } from './form-utils';

@Resolvable({
  ref: () => inject(FormRoot, { optional: true }) ?? getRootFieldState(inject(FORM_FIELD).state()),
})
export class FormCtx<T> {
  readonly ref = inject<FormRoot<T> | FieldState<T>>(RESOLVABLE_REF);
  readonly element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly #triedSubmitting = signal(false);
  readonly triedSubmitting = this.#triedSubmitting.asReadonly();

  constructor() {
    const unlisten = this.#renderer.listen(
      inject(DOCUMENT),
      'submit',
      evt => {
        const triedSubmit = isNode(evt.target) && evt.target.contains(this.element);
        if (triedSubmit) {
          this.#triedSubmitting.set(true);
          unlisten();
        }
      },
      { capture: true },
    );
  }
}
