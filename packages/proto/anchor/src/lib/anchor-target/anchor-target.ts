import { Resolvable } from '@terseware/proto';
import { uniqueId } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';

export type AnchorName = `--${string}`;

@Resolvable({ host: true })
export class AnchorTarget {
  readonly anchorName = bindable<AnchorName>(`--${uniqueId('anchor')}`);
  constructor() {
    hostBinding('style.anchor-name', this.anchorName);
  }
}
