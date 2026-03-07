import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { resolve } from '@terseware/proto';
import { signalBind } from '@terseware/utils';
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
