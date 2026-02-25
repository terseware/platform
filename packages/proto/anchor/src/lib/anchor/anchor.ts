import type { Signal } from '@angular/core';
import { afterRenderEffect, computed, signal } from '@angular/core';
import { Resolvable } from '@terseware/proto';
import { injectElement } from '@terseware/proto/internal';
import { bindable, hostBinding } from '@terseware/proto/utils';
import type { AnchorName } from '../anchor-target/anchor-target';

export type PositionArea =
  | 'none'
  // Single axis (spans full row/column)
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  // Single axis + center (narrow placement)
  | 'top center'
  | 'bottom center'
  | 'left center'
  | 'right center'
  // Center + axis (same visual, different containing block size)
  | 'center top'
  | 'center bottom'
  | 'center left'
  | 'center right'
  // Full span along an axis
  | 'top span-all'
  | 'bottom span-all'
  | 'left span-all'
  | 'right span-all'
  // Corners
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right';

// Try tactics that mirror the current position-area automatically
type TryTactic =
  | 'flip-block'
  | 'flip-inline'
  | 'flip-start'
  | 'flip-block flip-inline'
  | 'flip-block flip-start'
  | 'flip-inline flip-start';

// A single fallback entry: either a tactic, a position-area, or a named @position-try
export type PositionTryFallback = TryTactic | PositionArea | AnchorName;

export const POSITION_TRY_FALLBACKS_DEFAULT = [
  'flip-block',
  'flip-inline',
  'flip-block flip-inline',
] as const satisfies PositionTryFallback[];

const defaultFallbacks: PositionTryFallback | PositionTryFallback[] =
  POSITION_TRY_FALLBACKS_DEFAULT;

@Resolvable()
export class Anchor {
  readonly #element = injectElement();

  readonly anchorName = bindable<AnchorName | null>(null);
  readonly positionArea = bindable<PositionArea>('top');
  readonly positionTryFallbacks = bindable(defaultFallbacks);
  readonly offsetX = bindable(0);
  readonly offsetY = bindable(0);

  readonly align: Signal<PositionArea>;

  constructor() {
    const fallbacks = computed(() => {
      const val = this.positionTryFallbacks();
      return Array.isArray(val) ? val.join(', ') : val;
    });

    hostBinding('style', () => ({
      position: 'fixed',
      'position-anchor': this.anchorName(),
      'position-area': this.positionArea(),
      'position-try-fallbacks': fallbacks(),
      'offset-x': `${this.offsetX()}px`,
      'offset-y': `${this.offsetY()}px`,
    }));

    const align = signal(this.positionArea());
    this.align = align.asReadonly();

    hostBinding('attr.data-align', align);

    afterRenderEffect({
      earlyRead: () => {
        this.positionArea();
        this.positionTryFallbacks();
        const style = getComputedStyle(this.#element) as { positionArea?: PositionArea };
        return style;
      },
      write: positionArea => {
        const pos = positionArea().positionArea;
        align.update(a => pos ?? a);
      },
    });
  }
}
