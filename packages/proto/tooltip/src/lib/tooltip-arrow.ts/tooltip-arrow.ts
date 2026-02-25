import { inject } from '@angular/core';
import { Resolvable, resolve } from '@terseware/proto';
import { Anchor } from '@terseware/proto/anchor';
import { bindable, hostBinding } from '@terseware/proto/utils';
import type { TooltipSide } from '../tooltip-trigger/tooltip-trigger';
import { TOOLTIP_SIDE_FLIP, TooltipTrigger } from '../tooltip-trigger/tooltip-trigger';

@Resolvable()
export class TooltipArrow {
  readonly size = bindable(8);

  constructor() {
    const trigger = inject(TooltipTrigger);
    const parentAnchor = inject(Anchor, { skipSelf: true });
    resolve(Anchor, { anchorName: trigger.anchorName });

    hostBinding('style', () => ({
      transform: 'rotate(45deg)',
      position: 'absolute',
      width: `${this.size()}px`,
      height: `${this.size()}px`,
      background: 'inherit',
      'pointer-events': 'none',
      [TOOLTIP_SIDE_FLIP[parentAnchor.align() as TooltipSide]]: `${-this.size() / 2}px`,
    }));
  }
}
