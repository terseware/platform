import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';
import { resolve } from '@terseware/proto';
import { TooltipArrow, TooltipTrigger } from '@terseware/proto/tooltip';
import { Theme } from '@terseware/ui/theme';
import { cn } from '@terseware/ui/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[terseTooltip]',
  exportAs: 'terseTooltip',
  host: {
    '[aria-label]': 'terseTooltip() || null',
  },
})
export class TerseTooltip {
  readonly terseTooltip = input<string>();

  constructor() {
    const trigger = resolve(TooltipTrigger, { content: _TerseTooltip });
    afterNextRender(() => {
      setTimeout(() => {
        trigger.open.set(true);
      }, 1000);
    });
  }
}

@Directive({ selector: '[terseTooltipArrow]' })
class _TerseTooltipArrow {
  constructor() {
    resolve(TooltipArrow);
  }
}

@Component({
  selector: 'terse-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [_TerseTooltipArrow],
  host: {
    '[style.color-scheme]': 'theme.inverseTheme()',
    '[class]': 'classValue()',
    'animate.enter': 'tooltip-enter',
    'animate.leave': 'tooltip-leave',
  },
  styles: `
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

    :host([data-align='top']) {
      --terse-tooltip-y: 5px;
      --terse-tooltip-align: bottom;
    }
    :host([data-align='bottom']) {
      --terse-tooltip-y: -5px;
      --terse-tooltip-align: top;
    }
    :host([data-align='left']) {
      --terse-tooltip-x: 5px;
      --terse-tooltip-align: right;
    }
    :host([data-align='right']) {
      --terse-tooltip-x: -5px;
      --terse-tooltip-align: left;
    }

    :host(.tooltip-enter:not([data-instant])) {
      transform-origin: var(--terse-tooltip-align);
      animation: tooltipEnter 100ms ease-in-out;
    }
    :host(.tooltip-leave:not([data-instant])) {
      transform-origin: var(--terse-tooltip-align);
      animation: tooltipLeave 100ms ease-in-out;
    }
  `,
  template: `
    <div terseTooltipArrow></div>
    {{ tooltip.terseTooltip() }}
  `,
})
class _TerseTooltip {
  readonly tooltip = inject(TerseTooltip);
  readonly theme = inject(Theme);
  readonly arrow = input(true);
  readonly class = input<ClassValue>();
  readonly classValue = computed(() =>
    cn(
      'bg-surface-light text-on-surface relative block w-fit max-w-xs rounded-md px-2 py-1.5 text-xs text-balance',
      this.class(),
    ),
  );
}
