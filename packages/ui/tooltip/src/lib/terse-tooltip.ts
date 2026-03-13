import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { ProtoClasses, resolve } from '@terseware/proto';
import { TooltipArrowProto, TooltipProto, TooltipTriggerProto } from '@terseware/proto/tooltip';
import { cn } from '@terseware/ui/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: '[terseTooltip]',
  exportAs: 'terseTooltip',
})
export class TerseTooltip {
  readonly content = model<string | null>(null, { alias: 'terseTooltip' });
  constructor() {
    resolve(TooltipTriggerProto).content.set(_TerseTooltip);
  }
}

@Directive({ selector: '[terseTooltipArrow]' })
class TerseTooltipArrow {
  constructor() {
    resolve(TooltipArrowProto);
  }
}

@Component({
  selector: 'terse-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TerseTooltipArrow],
  host: {
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
      animation: tooltipEnter 150ms ease-in-out;
    }
    :host(.tooltip-leave:not([data-instant])) {
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
    <span class="bg-inherit" terseTooltipArrow></span>
  `,
})
class _TerseTooltip {
  readonly #classes = resolve(ProtoClasses);
  readonly inverseTheme = inject(DOCUMENT).documentElement.classList.contains('dark')
    ? 'light'
    : 'dark';

  readonly tooltip = inject(TerseTooltip);
  readonly class = input<ClassValue>();
  readonly classValue = computed(() => cn());
  readonly arrow = viewChild.required('arrow', { read: ElementRef });

  constructor() {
    resolve(TooltipProto);
    this.#classes.add(() => [
      this.inverseTheme,
      'bg-surface-light text-on-surface relative inline-block w-fit max-w-xs rounded-md px-2 py-1.5 text-xs text-balance',
      this.class(),
    ]);
  }
}
