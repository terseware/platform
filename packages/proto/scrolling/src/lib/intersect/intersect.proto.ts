import { afterRenderEffect, inject, signal, untracked } from '@angular/core';
import { ProtoHost, Resolvable } from '@terseware/proto';

@Resolvable()
export class IntersectProto {
  readonly #host = inject(ProtoHost);

  readonly disabled = signal(false);
  readonly threshold = signal<number | number[]>(0);
  readonly root = signal<Element | null>(null);
  readonly rootMargin = signal<string>('0px');

  readonly isIntersecting = signal(false);

  constructor() {
    this.#host.bindAttr('data-intersecting', () =>
      !this.disabled() && this.isIntersecting() ? '' : null,
    );

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

        observer.observe(this.#host.element);
        onCleanup(() => observer.disconnect());
      });
    });
  }
}
