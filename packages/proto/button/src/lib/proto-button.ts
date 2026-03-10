import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { resolve } from '@terseware/proto';
import { signalBind } from '@terseware/utils';
import { Button } from './button';

@Directive({
  selector: '[protoButton]',
  exportAs: 'protoButton',
})
export class ProtoButton {
  readonly button = resolve(Button);

  readonly disabled = input<boolean, BooleanInput>(this.button.interact.disabled(), {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(
    this.button.interact.focusableWhenDisabled(),
    { transform: booleanAttribute },
  );

  readonly tabIndex = input<number, NumberInput>(this.button.interact.tabIndex(), {
    transform: value => numberAttribute(value, this.button.interact.tabIndex()),
  });

  readonly role = input<string | null>(this.button.role());
  readonly type = input<string | null>(this.button.type());

  constructor() {
    signalBind(this.button.interact.disabled, this.disabled);
    signalBind(this.button.interact.focusableWhenDisabled, this.focusableWhenDisabled);
    signalBind(this.button.interact.tabIndex, this.tabIndex);
    signalBind(this.button.role, this.role);
    signalBind(this.button.type, this.type);
  }
}
