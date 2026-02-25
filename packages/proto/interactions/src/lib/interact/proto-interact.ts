import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import type { Signal } from '@angular/core';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { attachBindings, resolve } from '@terseware/proto';
import { Interact } from './interact';

@Directive({
  selector: '[protoInteract]',
  exportAs: 'protoInteract',
})
export class ProtoInteract {
  readonly #interact = resolve(Interact);

  readonly disabled = input<boolean, BooleanInput>(this.#interact.disabled(), {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(
    this.#interact.focusableWhenDisabled(),
    { transform: booleanAttribute },
  );

  readonly tabIndex = input<number, NumberInput>(this.#interact.tabIndex(), {
    transform: value => numberAttribute(value, this.#interact.tabIndex()),
  });

  constructor() {
    attachBindings(this.#interact, {
      disabled: this.disabled,
      focusableWhenDisabled: this.focusableWhenDisabled,
      tabIndex: this.tabIndex,
    });
  }

  setDisabled(disabled: boolean | Signal<boolean>): void {
    this.#interact.disabled.set(disabled);
  }

  setFocusableWhenDisabled(focusableWhenDisabled: boolean | Signal<boolean>): void {
    this.#interact.focusableWhenDisabled.set(focusableWhenDisabled);
  }

  setTabIndex(tabIndex: number | Signal<number>): void {
    this.#interact.tabIndex.set(tabIndex);
  }
}
