import { Directive, input, output } from '@angular/core';
import { attachBindings, resolve } from '@terseware/proto';
import { onChange } from '@terseware/proto/internal';
import { Intersect } from './intersect';

@Directive({
  selector: '[protoIntersect]',
  exportAs: 'protoIntersect',
})
export class ProtoIntersect {
  readonly #intersect = resolve(Intersect);

  readonly threshold = input<number | number[]>(this.#intersect.threshold());
  readonly root = input<Element | null>(this.#intersect.root());
  readonly rootMargin = input<string>(this.#intersect.rootMargin());

  readonly isIntersecting = this.#intersect.isIntersecting;
  readonly protoIntersect = output<void>();

  constructor() {
    attachBindings(this.#intersect, {
      threshold: this.threshold,
      root: this.root,
      rootMargin: this.rootMargin,
    });

    onChange(this.#intersect.isIntersecting, () => this.protoIntersect.emit());
  }
}
