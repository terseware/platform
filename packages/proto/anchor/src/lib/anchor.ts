import { Resolvable } from '@terseware/proto';
import { uniqueId } from '@terseware/proto/internal';
import { hostBinding } from '@terseware/proto/utils';

export type AnchorName = Anchor['name'];

@Resolvable({ host: true })
export class Anchor {
  readonly name = `--${uniqueId('anchor')}` as const;
  constructor() {
    hostBinding('style.anchor-name', () => this.name);
  }
}
