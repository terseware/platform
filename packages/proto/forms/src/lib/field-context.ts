import type { Injector } from '@angular/core';
import { computed, inject } from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { Resolvable } from '@terseware/proto';
import { disposable, ElementRenderer, isomorphicEffect, scoped } from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { ProtoFieldDescription } from './field-description';
import type { ProtoFieldError } from './field-error';
import type { ProtoFieldLabel } from './field-label';

@Resolvable()
export class FieldContext<T> {
  readonly #renderer = inject(ElementRenderer);
  readonly #field = inject<FormField<T>>(FORM_FIELD);
  readonly state = this.#field.state;
  readonly id = this.#renderer.id(this.#field.element, 'field');

  readonly #labels = new SignalSet<ProtoFieldLabel<T>>();
  addLabel(label: ProtoFieldLabel<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addLabel, injector, () => {
      this.#labels.add(label);
      return () => this.#labels.delete(label);
    });
  }

  readonly #descriptions = new SignalSet<ProtoFieldDescription<T>>();
  addDescription(
    description: ProtoFieldDescription<T>,
    injector?: Injector | null | undefined,
  ): () => void {
    return disposable(this.addDescription, injector, () => {
      this.#descriptions.add(description);
      return () => this.#descriptions.delete(description);
    });
  }

  readonly #errors = new SignalSet<ProtoFieldError<T>>();
  addError(error: ProtoFieldError<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addError, injector, () => {
      this.#errors.add(error);
      return () => this.#errors.delete(error);
    });
  }

  constructor() {
    const el = this.#field.element;
    const r = this.#renderer;

    isomorphicEffect({
      earlyRead: () => this.state().invalid() && this.state().touched(),
      write: invalid => r.setAttr(el, 'aria-invalid', invalid() ? 'true' : null),
    });

    isomorphicEffect({
      earlyRead: computed(() => [...this.#labels.values()].map(label => label.id), {
        equal: (a, b) => a.sort().every((id, index) => id === b[index]),
      }),
      write: idsSource => {
        const ids = idsSource();
        scoped(() => r.addAttr(el, 'aria-labelledby', ids));
      },
    });

    isomorphicEffect({
      earlyRead: computed(
        () => [...this.#descriptions.values(), ...this.#errors.values()].map(item => item.id),
        { equal: (a, b) => a.sort().every((id, index) => id === b[index]) },
      ),
      write: idsSource => {
        const ids = idsSource();
        scoped(() => r.addAttr(el, 'aria-describedby', ids));
      },
    });
  }
}
