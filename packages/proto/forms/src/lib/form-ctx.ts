import type { Injector } from '@angular/core';
import { computed, DOCUMENT, inject, signal } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { FORM_FIELD, FormRoot } from '@angular/forms/signals';
import { Resolvable, RESOLVABLE_REF } from '@terseware/proto';
import {
  disposable,
  ElementRenderer,
  injectElement,
  isNil,
  isNode,
  isomorphicEffect,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { FieldCtx } from './field-ctx';
import { getRootFieldState } from './form-utils';

@Resolvable({
  ref: () => inject(FormRoot, { optional: true }) ?? getRootFieldState(inject(FORM_FIELD).state()),
})
export class FormCtx<T> {
  readonly #ref = inject<FormRoot<T> | FieldState<T>>(RESOLVABLE_REF);
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly state = computed(() =>
    this.#ref instanceof FormRoot ? this.#ref.fieldTree()() : this.#ref,
  );

  readonly #triedSubmitting = signal(false);
  readonly triedSubmitting = this.#triedSubmitting.asReadonly();

  readonly #fieldCtxs = new SignalSet<FieldCtx<T>>();
  addFieldCtx(fieldCtx: FieldCtx<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addFieldCtx, injector, () => {
      this.#fieldCtxs.add(fieldCtx);
      return () => this.#fieldCtxs.delete(fieldCtx);
    });
  }

  readonly dataAttributes: Record<string, (state: FieldState<T>) => boolean> = {
    'data-disabled': state => state.disabled(),
    'data-dirty': state => state.dirty(),
    'data-filled': state =>
      !!state.formFieldBindings().length && !isNil(state.value()) && state.value() !== '',
    'data-invalid': state => state.invalid(),
    'data-pending': state => state.pending(),
    'data-pristine': state => !state.dirty(),
    'data-readonly': state => state.readonly(),
    'data-required': state => state.required(),
    'data-touched': state => state.touched(),
    'data-valid': state => state.valid(),
  };

  constructor() {
    for (const [attribute, condition] of Object.entries(this.dataAttributes)) {
      isomorphicEffect({
        write: () => {
          this.#renderer.setAttr(this.#element, attribute, condition(this.state()) ? '' : null);
        },
      });
    }

    this.#renderer.listen(
      inject(DOCUMENT),
      'submit',
      event => {
        const triedSubmit = isNode(event.target) && event.target.contains(this.#element);
        if (triedSubmit) {
          this.#triedSubmitting.set(true);
          if (this.state().invalid()) {
            this.state().focusBoundControl();
          }
        }
      },
      { capture: true },
    );
  }
}
