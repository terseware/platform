import { afterRenderEffect, computed, inject, signal, untracked } from '@angular/core';
import { Behavior } from '@terseware/proto';
import { ElementRenderer, injectElement, isNumber, isomorphicEffect } from '@terseware/utils';

export type AnchorArrowAlign = 'top' | 'bottom' | 'left' | 'right';

@Behavior()
export class AnchorArrow {
  readonly #renderer = inject(ElementRenderer);
  readonly #element = injectElement();

  readonly size = signal<string | number>('8px');
  readonly align = signal<AnchorArrowAlign>('top');
  readonly pointingToElement = signal<Element | null>(null);
  readonly attachedToElement = signal<Element | null>(null);

  readonly #top = signal('50%');
  readonly top = this.#top.asReadonly();

  readonly #left = signal('50%');
  readonly left = this.#left.asReadonly();

  readonly sizeHalf = computed(() => `calc(${this.size()} / 2)`);

  constructor() {
    this.#renderer.setAttr(this.#element, 'aria-hidden', 'true');

    isomorphicEffect({
      write: () => {
        const size = this.size();
        const sizePx = isNumber(size) ? `${size}px` : size || '0px';
        this.#renderer.styles(this.#element, {
          position: 'absolute',
          pointerEvents: 'none',
          transform: 'rotate(45deg)',
          width: sizePx,
          height: sizePx,
          left: this.left(),
          top: this.top(),
        });
      },
    });

    afterRenderEffect(onCleanup => {
      const pointingToElement = this.pointingToElement();
      const attachedToElement = this.attachedToElement();
      if (!pointingToElement || !attachedToElement) {
        return;
      }

      const align = this.align();

      untracked(() => {
        const calc = () => this.#calculatePosition(align, pointingToElement, attachedToElement);
        const ro = new ResizeObserver(calc);
        ro.observe(pointingToElement);
        ro.observe(attachedToElement);
        calc();
        onCleanup(() => ro.disconnect());
      });
    });
  }

  #calculatePosition(
    align: AnchorArrowAlign,
    pointingToElement: Element,
    attachedToElement: Element,
  ) {
    const pointingToRect = pointingToElement.getBoundingClientRect();
    const attachedToRect = attachedToElement.getBoundingClientRect();

    if (align === 'top' || align === 'bottom') {
      if (pointingToRect.width > attachedToRect.width) {
        this.#left.set(`calc(50% - ${this.sizeHalf()})`);
      } else {
        const leftDiff = Math.abs(pointingToRect.left - attachedToRect.left);
        this.#left.set(`calc(${leftDiff + pointingToRect.width / 2}px - ${this.sizeHalf()})`);
      }
      if (align === 'top') {
        this.#top.set(`calc(100% - ${this.sizeHalf()})`);
      } else if (align === 'bottom') {
        this.#top.set(`calc(0% - ${this.sizeHalf()})`);
      }
    } else if (align === 'left' || align === 'right') {
      if (pointingToRect.height > attachedToRect.height) {
        this.#top.set(`calc(50% - ${this.sizeHalf()})`);
      } else {
        const topDiff = Math.abs(pointingToRect.top - attachedToRect.top);
        this.#top.set(`calc(${topDiff + pointingToRect.height / 2}px - ${this.sizeHalf()})`);
      }
      if (align === 'left') {
        this.#left.set(`calc(100% - ${this.sizeHalf()})`);
      } else if (align === 'right') {
        this.#left.set(`calc(0% - ${this.sizeHalf()})`);
      }
    }
  }
}
