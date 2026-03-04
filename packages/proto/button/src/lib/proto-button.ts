import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input, numberAttribute } from '@angular/core';
import { Button } from './button';

@Directive({
  selector: '[protoButton]',
  exportAs: 'protoButton',
})
export class ProtoButton {
  readonly button = inject(Button);

  readonly disabled = input<boolean, BooleanInput>(this.button.disabled(), {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(
    this.button.focusableWhenDisabled(),
    { transform: booleanAttribute },
  );

  readonly tabIndex = input<number, NumberInput>(this.button.tabIndex(), {
    transform: value => numberAttribute(value, this.button.tabIndex()),
  });

  readonly role = input<string | null>(this.button.role());
  readonly type = input<string | null>(this.button.type());

  constructor() {
    this.button.disabled.set(this.disabled);
    this.button.focusableWhenDisabled.set(this.focusableWhenDisabled);
    this.button.tabIndex.set(this.tabIndex);
    this.button.role.set(this.role);
    this.button.type.set(this.type);
  }
}
