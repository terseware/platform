import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import type { Signal } from '@angular/core';
import { booleanAttribute, Directive, inject, input, numberAttribute } from '@angular/core';
import { Interact } from './interact';

@Directive({
  selector: '[protoInteract]',
  exportAs: 'protoInteract',
})
export class ProtoInteract {
  readonly #interact = inject(Interact);

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
    this.#interact.disabled.set(this.disabled);
    this.#interact.focusableWhenDisabled.set(this.focusableWhenDisabled);
    this.#interact.tabIndex.set(this.tabIndex);
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
