import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input, output } from '@angular/core';
import { onChange, signalBind } from '@terseware/utils';
import { Hover } from './hover';

@Directive({
  selector: '[protoHover]',
  exportAs: 'protoHover',
})
export class ProtoHover {
  readonly #hover = inject(Hover);

  readonly disabled = input<boolean, BooleanInput>(this.#hover.disabled(), {
    transform: booleanAttribute,
    alias: 'protoHoverDisabled',
  });

  /**
   * Emitted when hover starts.
   */
  readonly hoverStart = output<void>({ alias: 'protoHoverStart' });

  /**
   * Emitted when hover ends.
   */
  readonly hoverEnd = output<void>({ alias: 'protoHoverEnd' });

  readonly hoverChange = output<boolean>({ alias: 'protoHoverChange' });

  readonly isHovered = this.#hover.isHovered;

  constructor() {
    signalBind(this.#hover.disabled, this.disabled);

    onChange(this.isHovered, isHovered => {
      if (isHovered) {
        this.hoverChange.emit(true);
        this.hoverStart.emit();
      } else {
        this.hoverChange.emit(false);
        this.hoverEnd.emit();
      }
    });
  }

  setDisabled(disabled: boolean): void {
    this.#hover.disabled.set(disabled);
  }
}
