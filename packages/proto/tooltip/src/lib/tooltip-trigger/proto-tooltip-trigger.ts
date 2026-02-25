import type { NumberInput } from '@angular/cdk/coercion';
import { Directive, inject, input, numberAttribute } from '@angular/core';
import { attachBindings } from '@terseware/proto';
import type { TooltipContent, TooltipSide } from './tooltip-trigger';
import { TooltipTrigger } from './tooltip-trigger';

@Directive({
  selector: '[protoTooltipTrigger]',
  exportAs: 'protoTooltipTrigger',
})
export class ProtoTooltipTrigger {
  readonly #trigger = inject(TooltipTrigger);

  readonly protoTooltipTrigger = input<TooltipContent>(this.#trigger.content());
  readonly side = input<TooltipSide>(this.#trigger.side());

  readonly offsetX = input<number, NumberInput>(this.#trigger.offsetX(), {
    transform: v => numberAttribute(v, this.#trigger.offsetX()),
  });

  readonly offsetY = input<number, NumberInput>(this.#trigger.offsetY(), {
    transform: v => numberAttribute(v, this.#trigger.offsetY()),
  });

  readonly showDelay = input<number, NumberInput>(this.#trigger.showDelay(), {
    transform: v => numberAttribute(v, this.#trigger.showDelay()),
  });

  readonly hideDelay = input<number, NumberInput>(this.#trigger.hideDelay(), {
    transform: v => numberAttribute(v, this.#trigger.hideDelay()),
  });

  constructor() {
    attachBindings(this.#trigger, {
      content: this.protoTooltipTrigger,
      side: this.side,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      showDelay: this.showDelay,
      hideDelay: this.hideDelay,
    });
  }
}
