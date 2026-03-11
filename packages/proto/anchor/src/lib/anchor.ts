import { inject } from '@angular/core';
import { Behavior } from '@terseware/proto';
import { ElementRenderer, injectElement, uniqueId } from '@terseware/utils';

export type AnchorName = `--${string}`;

@Behavior()
export class Anchor {
  readonly #element = injectElement();
  readonly #renderer = inject(ElementRenderer);

  readonly name: AnchorName = `--${uniqueId('anchor')}`;

  constructor() {
    this.#renderer.setStyle(this.#element, 'anchorName', this.name);
  }
}
