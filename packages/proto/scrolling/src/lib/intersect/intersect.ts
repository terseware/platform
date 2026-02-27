import { afterRenderEffect, signal, untracked } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { injectElement } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

@Resolvable({ self: true })
export class Intersect {
  readonly #element = injectElement();

  readonly threshold = bindable<number | number[]>(0);
  readonly root = bindable<Element | null>(null);
  readonly rootMargin = bindable<string>('0px');

  readonly isIntersecting = signal(false);

  constructor() {
    hostBinding('attr.data-intersecting', () => (this.isIntersecting() ? '' : null));

    afterRenderEffect(onCleanup => {
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
