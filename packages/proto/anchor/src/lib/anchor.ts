import { inject } from '@angular/core';
import { ProtoHost, Resolvable } from '@terseware/proto';
import { uniqueId } from '@terseware/utils';

export type AnchorName = `--${string}`;

@Resolvable()
export class Anchor {
  readonly #host = inject(ProtoHost);

  readonly name: AnchorName = `--${uniqueId('anchor')}`;

  constructor() {
    this.#host.bindStyle('anchorName', () => this.name);
  }
}
