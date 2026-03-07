import { Directive, inject, input } from '@angular/core';
import { resolve } from '@terseware/proto';
import { AnchorArrow } from '@terseware/proto/anchor';
import { signalBind } from '@terseware/utils';
import { ProtoTooltip } from './proto-tooltip';
import { ProtoTooltipTrigger } from './proto-tooltip-trigger';

@Directive({
  selector: '[protoTooltipArrow]',
  exportAs: 'protoTooltipArrow',
})
export class ProtoTooltipArrow {
  readonly #trigger = inject(ProtoTooltipTrigger);
  readonly #tooltip = inject(ProtoTooltip);

  readonly #arrow = resolve(AnchorArrow);
  readonly left = this.#arrow.left;
  readonly top = this.#arrow.top;

  readonly arrowSize = input<string | number>('8px');

  constructor() {
    this.#trigger.setArrow(this);
    this.#arrow.pointingToElement.set(this.#trigger.element);
    this.#arrow.attachedToElement.set(this.#tooltip.element);
    signalBind(this.#arrow.size, this.arrowSize);
    signalBind(this.#arrow.align, this.#tooltip.align);
  }
}
