import { Directive, inject, input, output } from '@angular/core';
import { onChange } from '@terseware/utils';
import { Intersect } from './intersect';

@Directive({
  selector: '[protoIntersect]',
  exportAs: 'protoIntersect',
})
export class ProtoIntersect {
  readonly #intersect = inject(Intersect);

  readonly threshold = input<number | number[]>(this.#intersect.threshold());
  readonly root = input<Element | null>(this.#intersect.root());
  readonly rootMargin = input<string>(this.#intersect.rootMargin());

  readonly isIntersecting = this.#intersect.isIntersecting;
  readonly protoIntersect = output<void>();

  constructor() {
    this.#intersect.threshold.set(this.threshold);
    this.#intersect.root.set(this.root);
    this.#intersect.rootMargin.set(this.rootMargin);

    onChange(this.#intersect.isIntersecting, () => this.protoIntersect.emit());
  }
}
