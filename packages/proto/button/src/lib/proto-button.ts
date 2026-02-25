import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { attachBindings, resolve } from '@terseware/proto';
import { Button } from './button';

@Directive({
  selector: '[protoButton]',
  exportAs: 'protoButton',
})
export class ProtoButton {
  readonly #button = resolve(Button);

  readonly disabled = input<boolean, BooleanInput>(this.#button.disabled(), {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(
    this.#button.focusableWhenDisabled(),
    { transform: booleanAttribute },
  );

  readonly tabIndex = input<number, NumberInput>(this.#button.tabIndex(), {
    transform: value => numberAttribute(value, this.#button.tabIndex()),
  });

  readonly role = input<string | null>(this.#button.role());
  readonly type = input<string | null>(this.#button.type());

  readonly button = attachBindings(this.#button, {
    disabled: this.disabled,
    focusableWhenDisabled: this.focusableWhenDisabled,
    tabIndex: this.tabIndex,
    role: this.role,
    type: this.type,
  });
}
