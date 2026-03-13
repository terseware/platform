import { computed, effect, inject, runInInjectionContext, signal, untracked } from '@angular/core';
import type { FormField } from '@angular/forms/signals';
import { FORM_FIELD, FormRoot } from '@angular/forms/signals';
import { ProtoHost, Resolvable, resolve } from '@terseware/proto';
import { FocusProto } from '@terseware/proto/focus';
import { HoverProto } from '@terseware/proto/hover';
import { InteractProto } from '@terseware/proto/interact';
import { PressProto } from '@terseware/proto/press';
import { signalBind, supportsRequiredAttribute } from '@terseware/utils';
import { FormProto } from './form.proto';
import type { ProtoFieldErrorStrategy } from './forms-di';
import {
  installFieldDataAttributes,
  installFieldErrorDataAttributes,
  PROTO_FIELD_ERROR_STRATEGY,
  shouldFieldErrorsBeVisible,
} from './forms-di';
import { RESOLVER } from './forms-resolver';

@Resolvable()
export class FieldProto<T> {
  readonly #host = inject(ProtoHost);
  readonly #field = inject<FormField<T>>(FORM_FIELD, { host: true });
  readonly #element = this.#field.element;

  readonly id = this.#host.id('field');
  readonly state = this.#field.state;
  readonly errorStrategy = signal<ProtoFieldErrorStrategy<T>>(inject(PROTO_FIELD_ERROR_STRATEGY));

  readonly formCtx = computed(() => this.#host.resolveOnParent(FormRoot<T>, FormProto<T>));

  readonly errorsVisible = computed(() =>
    shouldFieldErrorsBeVisible(this.errorStrategy(), this.state(), this.formCtx()),
  );

  readonly triedSubmitting = computed(() => this.formCtx().triedSubmitting());

  constructor() {
    signalBind(resolve(InteractProto).disabled, () => this.state().disabled());
    resolve(HoverProto);
    resolve(PressProto);
    resolve(FocusProto);

    installFieldDataAttributes(this.#element, () => this.state());
    installFieldErrorDataAttributes(this.#element, () => this);

    this.#host.bindAttr('aria-invalid', () => (this.errorsVisible() ? 'true' : null));

    if (!supportsRequiredAttribute(this.#element)) {
      this.#host.bindAttr('aria-required', () => (this.state().required() ? 'true' : null));
    }

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
