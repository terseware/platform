import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { resolve } from '@terseware/proto';
import { ButtonProto } from '@terseware/proto/button';
import type { TerseButtonVariants } from '@terseware/ui/button';
import { terseButtonVariants } from '@terseware/ui/button';
import { TerseTooltip } from '@terseware/ui/tooltip';
import { cn } from '@terseware/ui/utils';
import { signalBind } from '@terseware/utils';
import type { ClassValue } from 'clsx';
import { Theme } from './theme';

@Component({
  selector: 'terse-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [TerseTooltip],
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideSun, lucideMoon })],
  host: {
    'data-slot': 'button',
    '[class]': 'classValue()',
    '(click)': 'theme.toggleTheme()',
  },
  template: `
    <ng-icon [name]="theme.theme() === 'dark' ? 'lucideSun' : 'lucideMoon'" />
    <ng-content />
  `,
})
export class TerseThemeToggle {
  readonly button = resolve(ButtonProto);
  readonly tooltip = inject(TerseTooltip);
  readonly theme = inject(Theme);

  readonly disabled = input<boolean, BooleanInput>(undefined, {
    transform: booleanAttribute,
  });

  readonly variant = input<TerseButtonVariants['variant']>('ghost');
  readonly size = input<TerseButtonVariants['size']>('icon');

  readonly class = input<ClassValue>();
  readonly classValue = computed(() =>
    cn(terseButtonVariants({ variant: this.variant(), size: this.size(), class: this.class() })),
  );

  constructor() {
    signalBind(this.button.interact.disabled, this.disabled);
    this.tooltip.content.set('Toggle Theme');
  }
}
