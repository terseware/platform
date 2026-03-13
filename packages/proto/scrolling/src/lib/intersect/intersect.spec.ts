import type { BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, input, output } from '@angular/core';
import { resolve } from '@terseware/proto';
import { onChange, signalBind } from '@terseware/utils';
import { render, screen } from '@testing-library/angular';
import { IntersectProto } from './intersect.proto';

@Directive({
  selector: '[protoIntersect]',
  exportAs: 'protoIntersect',
})
class ProtoIntersect {
  readonly #intersect = resolve(IntersectProto);

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

describe('ProtoIntersect', () => {
  it('should emit when intersect changes', async () => {
    await render(`<button protoIntersect></button>`, {
      imports: [ProtoIntersect],
    });

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('data-intersect');
  });
});
