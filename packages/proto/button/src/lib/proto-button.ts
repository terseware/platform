import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, numberAttribute } from '@angular/core';
import { ButtonPattern, FocusPattern, HoverPattern, PressPattern } from '@terseware/proto';

@Directive({
  selector: '[protoButton]',
  exportAs: 'protoButton',
})
export class ProtoButton {
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly tabIndex = input<number, NumberInput>(0, {
    transform: value => numberAttribute(value, 0),
  });

  readonly role = input<string | null>(null);
  readonly type = input<string | null>(null);

  readonly buttonPattern = new ButtonPattern({
    disabled: this.disabled,
    focusableWhenDisabled: this.focusableWhenDisabled,
    tabIndex: this.tabIndex,
    role: this.role,
    type: this.type,
  });

  readonly focusPattern = new FocusPattern({
    disabled: this.buttonPattern.hardDisabled,
  });

  readonly pressPattern = new PressPattern({
    disabled: this.buttonPattern.disabled,
  });

  readonly hoverPattern = new HoverPattern({
    disabled: this.buttonPattern.disabled,
  });
}
