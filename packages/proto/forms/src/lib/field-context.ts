import {
  computed,
  effect,
  inject,
  Injector,
  isWritableSignal,
  runInInjectionContext,
  untracked,
} from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD } from '@angular/forms/signals';
import { Resolvable } from '@terseware/proto';
import { Focus } from '@terseware/proto/focus';
import { Hover } from '@terseware/proto/hover';
import { Interact } from '@terseware/proto/interact';
import { Press } from '@terseware/proto/press';
import {
  disposable,
  ElementRenderer,
  isomorphicEffect,
  scoped,
  signalBind,
  unorderedComparator,
} from '@terseware/utils';
import { SignalSet } from 'ngxtension/collections';
import type { ProtoFieldDescription } from './field-description';
import type { ProtoFieldError } from './field-error';
import type { ProtoFieldLabel } from './field-label';
import { RESOLVER } from './field-metadata';
import { installFieldDataAttributes } from './form-di';

@Resolvable()
export class ProtoFieldContext<T> {
  readonly #injector = inject(Injector);
  readonly #renderer = inject(ElementRenderer);
  readonly #field = inject<FormField<T>>(FORM_FIELD);
  readonly id = this.#renderer.id(this.#field.element, 'field');
  readonly state = this.#field.state;

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

  constructor() {
    const interact = inject(Interact, { host: true });
    signalBind(interact.disabled, () => this.state().disabled());

    signalBind(inject(Hover).disabled, interact.disabled);
    signalBind(inject(Press).disabled, interact.disabled);
    signalBind(inject(Focus).disabled, interact.hardDisabled); // Allow focus when focusable when disabled is true

    const el = this.#field.element;
    const r = this.#renderer;

    isomorphicEffect({
      write: () => r.setAttr(el, 'aria-invalid', this.errorsVisible() ? 'true' : null),
    });

    installFieldDataAttributes(this.#field.element, () => this.#field.field()());
    isomorphicEffect({
      write: () => r.setAttr(el, 'data-errors-visible', this.errorsVisible() ? '' : null),
    });

    isomorphicEffect({
      write: () => r.setAttr(el, 'aria-required', this.state().required() ? 'true' : null),
    });

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
    effect(onCleanup => {
      const resolversMeta = this.state().metadata(RESOLVER);
      if (!resolversMeta) return;

      const list = untracked(resolversMeta);
      if (!list?.length) return;

      const bindings: { destroy(): void }[] = [];
      untracked(() => {
        for (const entry of list) {
          if (!entry) continue;
          const instance = runInInjectionContext(this.#injector, () =>
            inject(entry.type, entry.opts),
          );
          for (const [key, memoKey] of Object.entries(entry.propMemos)) {
            const memo = this.state().metadata(memoKey);
            if (!memo) continue;
            const sig = (instance as Record<string, unknown>)[key];
            if (isWritableSignal(sig)) {
              bindings.push(signalBind(sig, memo, { injector: this.#injector }));
            }
          }
        }
      });
      onCleanup(() => bindings.forEach(b => b.destroy()));
    });
  }
}
