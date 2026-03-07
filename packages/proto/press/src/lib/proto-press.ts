import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, output } from '@angular/core';
import { resolve } from '@terseware/proto';
import { onChange, signalBind } from '@terseware/utils';
import { Press } from './press';

@Directive({
  selector: '[protoPress]',
  exportAs: 'protoPress',
})
export class ProtoPress {
  readonly #press = resolve(Press);

  readonly disabled = input<boolean, BooleanInput>(this.#press.disabled(), {
    transform: booleanAttribute,
    alias: 'protoPressDisabled',
  });

  /**
   * Emitted when press starts.
   */
  readonly pressStart = output<void>({ alias: 'protoPressStart' });

  /**
   * Emitted when press ends.
   */
  readonly pressEnd = output<void>({ alias: 'protoPressEnd' });

  readonly pressChange = output<boolean>({ alias: 'protoPressChange' });

  readonly isPressed = this.#press.isPressed;

  constructor() {
    signalBind(this.#press.disabled, this.disabled);

    onChange(this.isPressed, isPressed => {
      if (isPressed) {
        this.pressChange.emit(true);
        this.pressStart.emit();
      } else {
        this.pressChange.emit(false);
        this.pressEnd.emit();
      }
    });
  }

  setDisabled(disabled: boolean): void {
    this.#press.disabled.set(disabled);
  }
}
