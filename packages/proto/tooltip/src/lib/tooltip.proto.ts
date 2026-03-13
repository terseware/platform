import { afterEveryRender, computed, inject, signal } from '@angular/core';
import { ProtoHost, Resolvable } from '@terseware/proto';
import { injectElement, onDestroy } from '@terseware/utils';
import type { TooltipSide } from './tooltip-trigger.proto';
import { TooltipTriggerProto } from './tooltip-trigger.proto';

@Resolvable()
export class TooltipProto {
  readonly element = injectElement();
  readonly #trigger = inject(TooltipTriggerProto);
  readonly #host = inject(ProtoHost);
  readonly id = this.#host.id('tooltip');
  readonly anchorName = `${this.#trigger.anchorName}-${this.id}` as const;
  readonly gap = this.#trigger.gap;
  readonly side = this.#trigger.tooltipSide;
  readonly sideFlip = this.#trigger.tooltipSideFlip;
  readonly instant = this.#trigger.isInstant;

  readonly arrowTop = computed(() => this.#trigger.arrow()?.top() ?? '50%');
  readonly arrowLeft = computed(() => this.#trigger.arrow()?.left() ?? '50%');

  readonly #align = signal(this.side());
  readonly align = this.#align.asReadonly();

  constructor() {
    onDestroy(this.#trigger.setTooltip(this));

    afterEveryRender(() => {
      const style = getComputedStyle(this.element) as { positionArea?: TooltipSide };
      this.#align.update(align => style.positionArea ?? align);
    });

    this.#host.setAttr('role', 'tooltip');

    this.#host.bindAttrs({
      'data-align': () => (this.align() ? '' : null),
      'data-side': () => (this.side() ? '' : null),
      'data-gap': () => (this.gap() ? '' : null),
      'data-instant': () => (this.instant() ? '' : null),
      'data-arrow-left': () => (this.arrowLeft() ? '' : null),
      'data-arrow-top': () => (this.arrowTop() ? '' : null),
    });

    this.#host.bindStyles(() => ({
      anchorName: this.anchorName,
      positionAnchor: this.#trigger.anchorName,
      containerType: 'anchored',
      positionArea: this.side(),
      positionTryFallbacks: 'flip-block, flip-inline, flip-block flip-inline',
      position: 'fixed',
      [`margin-${this.sideFlip()}`]: this.gap(),
      '--proto-tooltip-align': this.align(),
      '--proto-tooltip-side': this.side(),
      '--proto-tooltip-gap': this.gap(),
      '--proto-tooltip-arrow-left': this.arrowLeft(),
      '--proto-tooltip-arrow-top': this.arrowTop(),
    }));
  }
}
