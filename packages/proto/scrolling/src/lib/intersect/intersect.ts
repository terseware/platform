import { afterRenderEffect, inject, signal, untracked } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, isomorphicEffect } from '@terseware/utils';

@Resolvable()
export class Intersect {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly disabled = signal(false);
  readonly threshold = signal<number | number[]>(0);
  readonly root = signal<Element | null>(null);
  readonly rootMargin = signal<string>('0px');

  readonly isIntersecting = signal(false);

  constructor() {
    isomorphicEffect({
      earlyRead: () => !this.disabled() && this.isIntersecting(),
      write: intersecting =>
        this.#renderer.setAttr(this.#element, 'data-intersecting', intersecting() ? '' : null),
    });

    afterRenderEffect(onCleanup => {
      if (this.disabled()) {
        return;
      }

      const options: IntersectionObserverInit = {
        threshold: this.threshold(),
        root: this.root(),
        rootMargin: this.rootMargin(),
      };

      untracked(() => {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(({ isIntersecting }) => {
            this.isIntersecting.set(isIntersecting);
          });
        }, options);

        observer.observe(this.#element);
        onCleanup(() => observer.disconnect());
      });
    });
  }
}
