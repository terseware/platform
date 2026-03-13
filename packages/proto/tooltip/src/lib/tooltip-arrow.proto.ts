import { inject, signal } from '@angular/core';
import { Resolvable, resolve } from '@terseware/proto';
import { AnchorArrowProto } from '@terseware/proto/anchor';
import { onDestroy, signalBind } from '@terseware/utils';
import { TooltipTriggerProto } from './tooltip-trigger.proto';
import { TooltipProto } from './tooltip.proto';

@Resolvable()
export class TooltipArrowProto {
  readonly #trigger = inject(TooltipTriggerProto);
  readonly #tooltip = inject(TooltipProto);

  readonly #arrow = resolve(AnchorArrowProto);
  readonly left = this.#arrow.left;
  readonly top = this.#arrow.top;

  readonly arrowSize = signal<string | number>('8px');

  constructor() {
    onDestroy(this.#trigger.setArrow(this));
    this.#arrow.pointingToElement.set(this.#trigger.element);
    this.#arrow.attachedToElement.set(this.#tooltip.element);
    signalBind(this.#arrow.size, this.arrowSize);
    signalBind(this.#arrow.align, this.#tooltip.align);
  }
}
