import { afterNextRender, computed, Directive, inject, input, signal } from '@angular/core';
import { isNumber } from '@terseware/proto/internal';
import { ProtoTooltip } from './proto-tooltip';
import { ProtoTooltipTrigger } from './proto-tooltip-trigger';

@Directive({
  selector: '[protoTooltipArrow]',
  exportAs: 'protoTooltipArrow',
  host: {
    tabindex: '-1',
    'aria-hidden': 'true',
    '[style]': 'styles()',
  },
})
export class ProtoTooltipArrow {
  readonly #trigger = inject(ProtoTooltipTrigger);
  readonly tooltip = inject(ProtoTooltip);

  readonly arrowSize = input<string, string | number>('8px', {
    transform: v => (isNumber(v) ? `${v}px` : v || '0px'),
  });

  readonly top = signal('50%');
  readonly left = signal('50%');
  readonly sizeHalf = computed(() => `calc(${this.arrowSize()} / 2)`);

  readonly styles = computed(() => {
    const tooltip = this.#trigger.tooltip();
    if (!tooltip) {
      return null;
    }

    const styles: Record<string, string> = {
      position: 'absolute',
      pointerEvents: 'none',
      transform: 'rotate(45deg)',
      width: this.arrowSize(),
      height: this.arrowSize(),
      left: this.left(),
      top: this.top(),
    };

    return styles;
  });

  constructor() {
    this.#trigger.arrow.set(this);

    afterNextRender(() => {
      this.#calculatePosition();
    });

    // hostBinding(
    //   '(animationend)',
    //   () => {
    //     this.#calculatePosition();
    //   },
    //   { element: this.tooltip.element },
    // );
  }

  #calculatePosition() {
    const align = this.tooltip.align();
    const tooltipRect = this.tooltip.element.getBoundingClientRect();
    const triggerRect = this.#trigger.element.getBoundingClientRect();

    if (align === 'top' || align === 'bottom') {
      if (triggerRect.width > tooltipRect.width) {
        this.left.set(`calc(50% - ${this.sizeHalf()})`);
      } else {
        const leftDiff = Math.abs(triggerRect.left - tooltipRect.left);
        this.left.set(`calc(${leftDiff + triggerRect.width / 2}px - ${this.sizeHalf()})`);
      }
      if (align === 'top') {
        this.top.set(`calc(100% - ${this.sizeHalf()})`);
      } else if (align === 'bottom') {
        this.top.set(`calc(0% - ${this.sizeHalf()})`);
      }
    } else if (align === 'left' || align === 'right') {
      if (triggerRect.height > tooltipRect.height) {
        this.top.set(`calc(50% - ${this.sizeHalf()})`);
      } else {
        const topDiff = Math.abs(triggerRect.top - tooltipRect.top);
        this.top.set(`calc(${topDiff + triggerRect.height / 2}px - ${this.sizeHalf()})`);
      }
      if (align === 'left') {
        this.left.set(`calc(100% - ${this.sizeHalf()})`);
      } else if (align === 'right') {
        this.left.set(`calc(0% - ${this.sizeHalf()})`);
      }
    }

    requestAnimationFrame(() => this.#calculatePosition());
  }
}
