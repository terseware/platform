import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input, numberAttribute } from '@angular/core';
import { signalBind } from '@terseware/utils';
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
    signalBind(this.#interact.disabled, this.disabled);
    signalBind(this.#interact.focusableWhenDisabled, this.focusableWhenDisabled);
    signalBind(this.#interact.tabIndex, this.tabIndex);
  }

  setDisabled(disabled: boolean): void {
    this.#interact.disabled.set(disabled);
  }

  setFocusableWhenDisabled(focusableWhenDisabled: boolean): void {
    this.#interact.focusableWhenDisabled.set(focusableWhenDisabled);
  }

  setTabIndex(tabIndex: number): void {
    this.#interact.tabIndex.set(tabIndex);
  }
}
