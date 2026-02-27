import { afterEveryRender, computed, Directive, inject, signal } from '@angular/core';
import { injectElement, onDestroy, uniqueId } from '@terseware/proto/internal';
import type { TooltipSide } from './proto-tooltip-trigger';
import { ProtoTooltipTrigger } from './proto-tooltip-trigger';

@Directive({
  selector: '[protoTooltip]',
  exportAs: 'protoTooltip',
  host: {
    '[id]': 'id',
    role: 'tooltip',
    '[style]': 'styles()',
    '[attr.data-align]': 'align()',
    '[attr.data-side]': 'side()',
    '[attr.data-instant]': "instant() ? '' : null",
    '[style.--proto-tooltip-align]': 'align()',
    '[style.--proto-tooltip-side]': 'side()',
    '[style.--proto-tooltip-gap]': 'gap()',
    '[style.--proto-tooltip-arrow-left]': 'arrowLeft()',
    '[style.--proto-tooltip-arrow-top]': 'arrowTop()',
  },
})
export class ProtoTooltip {
  readonly element = injectElement();
  readonly #trigger = inject(ProtoTooltipTrigger);

  readonly id = uniqueId('tooltip');
  readonly anchorName = `${this.#trigger.anchorName}-${this.id}` as const;
  readonly gap = this.#trigger.gap;
  readonly side = this.#trigger.tooltipSide;
  readonly sideFlip = this.#trigger.tooltipSideFlip;
  readonly instant = this.#trigger.isInstant;

  readonly arrowTop = computed(() => this.#trigger.arrow()?.top() ?? '50%');
  readonly arrowLeft = computed(() => this.#trigger.arrow()?.left() ?? '50%');

  readonly styles = computed(() => ({
    anchorName: this.anchorName,
    positionAnchor: this.#trigger.anchorName,
    containerType: 'anchored',
    positionArea: this.side(),
    positionTryFallbacks: 'flip-block, flip-inline, flip-block flip-inline',
    position: 'fixed',
    [`margin-${this.sideFlip()}`]: this.gap(),
  }));

  readonly #align = signal(this.side());
  readonly align = this.#align.asReadonly();

  constructor() {
    this.#trigger.tooltip.set(this);
    onDestroy(() => this.#trigger.tooltip.set(null));
    afterEveryRender(() => {
      const style = getComputedStyle(this.element) as { positionArea?: TooltipSide };
      this.#align.update(align => style.positionArea ?? align);
    });
  }
}
