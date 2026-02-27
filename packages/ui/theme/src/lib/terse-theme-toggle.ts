import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { ProtoButton } from '@terseware/proto/button';
import type { TerseButtonVariants } from '@terseware/ui/button';
import { terseButtonVariants } from '@terseware/ui/button';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { TerseTooltip } from '@terseware/ui/tooltip';
import { cn } from '@terseware/ui/utils';
import type { ClassValue } from 'clsx';
import { Theme } from './theme';

@Component({
  selector: 'terse-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TerseIcon],
  hostDirectives: [
    TerseTooltip,
    {
      directive: ProtoButton,
      inputs: ['disabled', 'focusableWhenDisabled', 'tabIndex', 'role', 'type'],
    },
  ],
  host: {
    'data-slot': 'button',
    '[class]': 'classValue()',
    '(click)': 'theme.toggleTheme()',
  },
  template: `<svg [terseIcon]="terseIcon()"></svg><ng-content />`,
})
export class TerseThemeToggle {
  readonly #tooltip = inject(TerseTooltip);
  readonly theme = inject(Theme);

  readonly terseIcon = computed(() =>
    this.theme.theme() === 'dark'
      ? toTerseIcon('Light Mode', lucideSun)
      : toTerseIcon('Dark Mode', lucideMoon),
  );

  readonly variant = input<TerseButtonVariants['variant']>('ghost');
  readonly size = input<TerseButtonVariants['size']>('icon');

  readonly class = input<ClassValue>();
  readonly classValue = computed(() =>
    cn(terseButtonVariants({ variant: this.variant(), size: this.size(), class: this.class() })),
  );

  constructor() {
    this.#tooltip.content.set('Toggle Theme');
  }
}
