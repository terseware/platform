import { inject } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { ElementRenderer, injectElement, uniqueId } from '@terseware/utils';

export type AnchorName = `--${string}`;

@Resolvable({ inherit: false })
export class Anchor {
  readonly name: AnchorName = `--${uniqueId('anchor')}`;

  constructor() {
    const el = injectElement();
    const renderer = inject(ElementRenderer);
    renderer.setStyle(el, 'anchorName', this.name);
  }
}
