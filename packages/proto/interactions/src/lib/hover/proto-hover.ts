import type { BooleanInput } from '@angular/cdk/coercion';
import type { Signal } from '@angular/core';
import { booleanAttribute, Directive, input, output } from '@angular/core';
import { attachBindings, resolve } from '@terseware/proto';
import { onChange } from '@terseware/proto/internal';
import { Hover } from './hover';

@Directive({
  selector: '[protoHover]',
  exportAs: 'protoHover',
})
export class ProtoHover {
  readonly #hover = resolve(Hover);

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

  readonly hoveChange = output<boolean>({ alias: 'protoHoverChange' });

  readonly isHovered = this.#hover.isHovered;

  constructor() {
    attachBindings(this.#hover, { disabled: this.disabled });
    onChange(this.isHovered, isHovered => {
      if (isHovered) {
        this.hoveChange.emit(true);
        this.hoverStart.emit();
      } else {
        this.hoveChange.emit(false);
        this.hoverEnd.emit();
      }
    });
  }

  setDisabled(disabled: boolean | Signal<boolean>): void {
    this.#hover.disabled.set(disabled);
  }
}
