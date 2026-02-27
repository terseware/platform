import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
  model,
} from '@angular/core';
import { ProtoTooltip, ProtoTooltipArrow, ProtoTooltipTrigger } from '@terseware/proto/tooltip';
import { Theme } from '@terseware/ui/theme';
import { cn } from '@terseware/ui/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[terseTooltip]',
  exportAs: 'terseTooltip',
  hostDirectives: [
    {
      directive: ProtoTooltipTrigger,
      inputs: [
        'tooltipOpen',
        'tooltipShowDelay',
        'tooltipHideDelay',
        'tooltipSide',
        'tooltipOffset',
      ],
    },
  ],
  host: {
    '[aria-label]': 'content() || null',
  },
})
export class TerseTooltip {
  readonly #trigger = inject(ProtoTooltipTrigger);
  readonly content = model<string | null>(null, { alias: 'terseTooltip' });

  constructor() {
    this.#trigger.content.set(_TerseTooltip);
  }
}

@Component({
  selector: 'terse-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ProtoTooltip],
  imports: [ProtoTooltipArrow],
  host: {
    '[style.color-scheme]': 'theme.inverseTheme()',
    '[class]': 'classValue()',
    'animate.enter': 'tooltip-enter',
    'animate.leave': 'tooltip-leave',
  },
  styles: `
    :host([data-align='top']) {
      --terse-tooltip-y: var(--proto-tooltip-gap);
    }
    :host([data-align='bottom']) {
      --terse-tooltip-y: calc(var(--proto-tooltip-gap) * -1);
    }
    :host([data-align='left']) {
      --terse-tooltip-x: var(--proto-tooltip-gap);
    }
    :host([data-align='right']) {
      --terse-tooltip-x: calc(var(--proto-tooltip-gap) * -1);
    }

    :host {
      transform-origin: var(--proto-tooltip-arrow-left) var(--proto-tooltip-arrow-top);
    }

    :host(.tooltip-enter:not([data-instant])) {
      z-index: -1;
      animation: tooltipEnter 150ms ease-in-out;
    }
    :host(.tooltip-leave:not([data-instant])) {
      z-index: -1;
      animation: tooltipLeave 150ms ease-in-out;
    }

    @keyframes tooltipEnter {
      from {
        translate: var(--terse-tooltip-x, 0) var(--terse-tooltip-y, 0);
        scale: 0.9;
        opacity: 0;
      }
      to {
        translate: 0 0;
        scale: 1;
        opacity: 1;
      }
    }
    @keyframes tooltipLeave {
      from {
        translate: 0 0;
        scale: 1;
        opacity: 1;
      }
      to {
        translate: var(--terse-tooltip-x, 0) var(--terse-tooltip-y, 0);
        scale: 0.9;
        opacity: 0;
      }
    }
  `,
  template: `
    <span>{{ tooltip.content() }}</span>
    <span class="bg-inherit" protoTooltipArrow></span>
  `,
})
class _TerseTooltip {
  readonly tooltip = inject(TerseTooltip);
  readonly theme = inject(Theme);
  readonly class = input<ClassValue>();
  readonly classValue = computed(() =>
    cn(
      'bg-surface-light text-on-surface relative inline-block w-fit max-w-xs rounded-md px-2 py-1.5 text-xs text-balance',
      this.class(),
    ),
  );
}
