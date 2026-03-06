import {
  computed,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  untracked,
} from '@angular/core';
import type { FieldState, FormField } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { Resolvable } from '@terseware/proto';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import { Press } from '@terseware/proto/press';
import {
  disposable,
  ElementRenderer,
  isNil,
  isomorphicEffect,
  scoped,
  signalBind,
  supportsRequiredAttribute,
  unorderedComparator,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { ProtoFieldDescription } from './field-description';
import type { ProtoFieldError } from './field-error';
import type { ProtoFieldLabel } from './field-label';
import { RESOLVER } from './field-metadata';
import { FormCtx } from './form-ctx';

@Resolvable({ ref: FORM_FIELD })
export class FieldCtx<T> {
  readonly injector = inject(Injector);
  readonly #renderer = inject(ElementRenderer);
  readonly #field = inject<FormField<T>>(FORM_FIELD);
  readonly id = this.#renderer.id(this.#field.element, 'field');
  readonly state = this.#field.state;
  readonly element = this.#field.element;

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

  readonly errorsVisible = computed(() =>
    [...this.#errors.values()].some(error => error.visible()),
  );

  readonly triedSubmitting = computed(() =>
    runInInjectionContext(
      this.injector,
      () => inject(FormCtx, { optional: true })?.triedSubmitting() ?? false,
    ),
  );

  readonly dataAttributes: Record<string, (state: FieldState<T>) => boolean> = {
    'data-dirty': state => state.dirty(),
    'data-filled': state => !isNil(state.value()) && state.value() !== '',
    'data-invalid': state => state.invalid(),
    'data-pending': state => state.pending(),
    'data-pristine': state => !state.dirty(),
    'data-readonly': state => state.readonly(),
    'data-required': state => state.required(),
    'data-touched': state => state.touched(),
    'data-valid': state => state.valid(),
  };

  constructor() {
    const el = this.#field.element;
    const r = this.#renderer;

    const interact = inject(Interact, { host: true });
    signalBind(interact.disabled, () => this.state().disabled());
    signalBind(inject(Hover).disabled, interact.disabled);
    signalBind(inject(Press).disabled, interact.disabled);
    signalBind(inject(Focus).disabled, interact.hardDisabled); // Allow focus when focusable when disabled is true

    for (const [attribute, condition] of Object.entries(this.dataAttributes)) {
      isomorphicEffect({
        write: () => {
          for (const element of [
            el,
            ...[...this.#descriptions.values()].map(d => d.element),
            ...[...this.#errors.values()].map(e => e.element),
            ...[...this.#labels.values()].map(l => l.element),
          ]) {
            r.setAttr(element, attribute, condition(this.state()) ? '' : null);
          }
        },
      });
    }

    isomorphicEffect({
      write: () => r.setAttr(el, 'aria-invalid', this.errorsVisible() ? 'true' : null),
    });

    isomorphicEffect({
      write: () => r.setAttr(el, 'data-errors-visible', this.errorsVisible() ? '' : null),
    });

    if (!supportsRequiredAttribute(el)) {
      isomorphicEffect({
        write: () => r.setAttr(el, 'aria-required', this.state().required() ? 'true' : null),
      });
    }

    isomorphicEffect({
      earlyRead: computed(() => [...this.#labels.values()].map(label => label.id), {
        equal: unorderedComparator,
      }),
      write: idsSource => {
        const ids = idsSource();
        scoped(() => r.addAttr(el, 'aria-labelledby', ids));
      },
    });

    isomorphicEffect({
      earlyRead: computed(
        () => [...this.#descriptions.values(), ...this.#errors.values()].map(item => item.id),
        { equal: unorderedComparator },
      ),
      write: idsSource => {
        const ids = idsSource();
        scoped(() => r.addAttr(el, 'aria-describedby', ids));
      },
    });

    this.#installResolver();
  }

  #installResolver() {
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
