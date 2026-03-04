import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input, output } from '@angular/core';
import { onChange, signalBind } from '@terseware/utils';
import { Intersect } from './intersect';

@Directive({
  selector: '[protoIntersect]',
  exportAs: 'protoIntersect',
})
export class ProtoIntersect {
  readonly #intersect = inject(Intersect);

  readonly disabled = input<boolean, BooleanInput>(this.#intersect.disabled(), {
    transform: booleanAttribute,
    alias: 'protoIntersectDisabled',
  });

  readonly threshold = input<number | number[]>(this.#intersect.threshold(), {
    alias: 'protoIntersectThreshold',
  });

  readonly root = input<Element | null>(this.#intersect.root(), {
    alias: 'protoIntersectRoot',
  });

  readonly rootMargin = input<string>(this.#intersect.rootMargin(), {
    alias: 'protoIntersectRootMargin',
  });

  readonly isIntersecting = this.#intersect.isIntersecting;

  readonly protoIntersect = output<void>();

  constructor() {
    signalBind(this.#intersect.disabled, this.disabled);
    signalBind(this.#intersect.threshold, this.threshold);
    signalBind(this.#intersect.root, this.root);
    signalBind(this.#intersect.rootMargin, this.rootMargin);
    onChange(this.#intersect.isIntersecting, () => this.protoIntersect.emit());
  }
}
