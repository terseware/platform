import type { BooleanInput } from '@angular/cdk/coercion';
import type { Signal } from '@angular/core';
import { booleanAttribute, Directive, inject, input, output } from '@angular/core';
import { onChange } from '@terseware/utils';
import { Press } from './press';

@Directive({
  selector: '[protoPress]',
  exportAs: 'protoPress',
  providers: [Press],
})
export class ProtoPress {
  readonly #press = inject(Press);

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

  readonly hoveChange = output<boolean>({ alias: 'protoPressChange' });

  readonly isPressed = this.#press.isPressed;

  constructor() {
    this.#press.disabled.set(this.disabled);

    onChange(this.isPressed, isPressed => {
      if (isPressed) {
        this.hoveChange.emit(true);
        this.pressStart.emit();
      } else {
        this.hoveChange.emit(false);
        this.pressEnd.emit();
      }
    });
  }

  setDisabled(disabled: boolean | Signal<boolean>): void {
    this.#press.disabled.set(disabled);
  }
}
