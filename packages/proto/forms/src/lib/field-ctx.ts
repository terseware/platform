import type { Injector } from '@angular/core';
import { computed, effect, inject, runInInjectionContext, signal, untracked } from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { Resolvable, resolve } from '@terseware/proto';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import { Press } from '@terseware/proto/press';
import {
  disposable,
  ElementRenderer,
  isomorphicEffect,
  runInScope,
  signalBind,
  supportsRequiredAttribute,
  unorderedComparator,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import { FormCtx } from './form-ctx';
import {
  installFieldDataAttributes,
  installFieldErrorDataAttributes,
  PROTO_FIELD_ERROR_STRATEGY,
  shouldFieldErrorsBeVisible,
} from './forms-di';
import { RESOLVER } from './forms-resolver';
import type { ProtoFieldDescription } from './proto-field-description';
import type { ProtoFieldError } from './proto-field-error';
import type { ProtoFieldLabel } from './proto-field-label';

@Resolvable()
export class FieldCtx<T> {
  readonly #renderer = inject(ElementRenderer);
  readonly #field = inject<FormField<T>>(FORM_FIELD);
  readonly #element = this.#field.element;

  readonly id = this.#renderer.id(this.#field.element, 'field');
  readonly state = this.#field.state;
  readonly errorStrategy = signal(inject(PROTO_FIELD_ERROR_STRATEGY));

  readonly #labels = new SignalSet<ProtoFieldLabel<T>>();
  addLabel(label: ProtoFieldLabel<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addLabel, injector, () => {
      this.#labels.add(label);
      return () => this.#labels.delete(label);
    });
  }

  readonly #errors = new SignalSet<ProtoFieldError<T>>();
  addError(error: ProtoFieldError<T>, injector?: Injector | null | undefined): () => void {
    return disposable(this.addError, injector, () => {
      this.#errors.add(error);
      return () => this.#errors.delete(error);
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

  readonly formCtx = computed(() =>
    runInInjectionContext(this.#field.injector, () => resolve(FormCtx<T>)),
  );

  readonly errorsVisible = computed(() =>
    shouldFieldErrorsBeVisible(this.errorStrategy(), this.state(), this.formCtx()),
  );

  readonly triedSubmitting = computed(() => this.formCtx().triedSubmitting());

  constructor() {
    const interact = resolve(Interact);
    signalBind(interact.disabled, () => this.state().disabled());
    signalBind(resolve(Hover).disabled, interact.disabled);
    signalBind(resolve(Press).disabled, interact.disabled);
    signalBind(resolve(Focus).disabled, interact.hardDisabled); // Allow focus when focusable when disabled is true

    effect(onCleanup =>
      runInScope(this.#field.injector, onCleanup, () => this.formCtx().addFieldCtx(this)),
    );

    installFieldDataAttributes(() => this.state());
    installFieldErrorDataAttributes(() => this);

    isomorphicEffect({
      write: () =>
        this.#renderer.setAttr(this.#element, 'aria-invalid', this.errorsVisible() ? 'true' : null),
    });

    if (!supportsRequiredAttribute(this.#element)) {
      isomorphicEffect({
        write: () =>
          this.#renderer.setAttr(
            this.#element,
            'aria-required',
            this.state().required() ? 'true' : null,
          ),
      });
    }

    isomorphicEffect({
      earlyRead: computed(() => [...this.#labels.values()].map(label => label.id), {
        equal: unorderedComparator,
      }),
      write: (idsSource, onCleanup) => {
        const ids = idsSource();
        runInScope(this.#field.injector, onCleanup, () =>
          this.#renderer.disposableAttr(this.#element, 'aria-labelledby', ids),
        );
      },
    });

    isomorphicEffect({
      earlyRead: computed(
        () => [...this.#descriptions.values(), ...this.#errors.values()].map(item => item.id),
        { equal: unorderedComparator },
      ),
      write: (idsSource, onCleanup) => {
        const ids = idsSource();
        runInScope(this.#field.injector, onCleanup, () =>
          this.#renderer.disposableAttr(this.#element, 'aria-describedby', ids),
        );
      },
    });

    effect(() => {
      const resolversMeta = this.state().metadata(RESOLVER);
      if (!resolversMeta) {
        return;
      }

      const list = untracked(resolversMeta);
      if (!list?.length) {
        return;
      }

      for (const entry of list) {
        for (const field of entry.ctx.state.formFieldBindings()) {
          const instance = runInInjectionContext(field.injector, () => inject(entry.type));
          entry.handler(instance);
        }
      }
    });
  }
}
