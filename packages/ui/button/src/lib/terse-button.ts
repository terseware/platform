import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { resolve } from '@terseware/proto';
import { Button } from '@terseware/proto/button';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { cn } from '@terseware/ui/utils';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

export const terseButtonVariants = cva(
  "group/button data-focus-visible:ring-ring/70 inline-flex shrink-0 items-center justify-center rounded-md bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors duration-300 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-focus-visible:ring-3 data-press:duration-0 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        unset: '',
        default:
          'bg-primary text-on-primary not-data-disabled:shadow-s data-hover:bg-primary-hover data-press:bg-primary-press',
        secondary:
          'bg-surface-light text-on-surface data-hover:bg-surface-hover data-press:bg-surface-light-hover',
        outline:
          'border-border data-hover:bg-surface-hover bg-surface [&_svg]:text-on-surface-muted border',
        ghost: 'data-hover:bg-surface-hover [&_svg]:text-on-surface-muted',
        link: 'text-primary [&_svg]:text-on-surface-muted underline-offset-4 data-hover:underline',
        'menu-item':
          "data-hover:bg-surface-hover data-active:bg-surface-hover data-focus-visible:bg-surface-hover [&_svg:not([class*='text-'])]:text-primary aria-current:bg-surface-hover justify-start text-left",
        elevated:
          'bg-surface-light data-hover:bg-surface-light-hover not-data-disabled:shadow-s [&_svg]:text-on-surface-muted',
        danger:
          'bg-danger/10 data-focus-visible:ring-danger/20 text-danger data-focus-visible:border-danger/40 data-hover:bg-danger/20',
      },
      size: {
        unset: '',
        default:
          'h-9 gap-2 px-3 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-3 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: "h-10 gap-2.5 px-3 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-5",
        'icon-sm':
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-4",
        'icon-lg': "size-10 [&_svg:not([class*='size-'])]:size-6",
        'menu-item': 'justify-start p-2 text-left',
        breadcrumb: 'block w-auto max-w-50 place-content-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type TerseButtonVariants = VariantProps<typeof terseButtonVariants>;

@Component({
  selector: 'terse-button, [terseButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TerseIcon],
  host: {
    'data-slot': 'button',
    '[aria-label]': "loading() ? 'Loading, please wait' : null",
    '[class]': 'classValue()',
  },
  template: `
    @if (loading()) {
      <svg class="animate-spin" [terseIcon]="lucideLoaderCircle"></svg>
    }
    <ng-content />
  `,
})
export class TerseButton {
  readonly disabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly focusableWhenDisabled = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly loading = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });

  readonly tabIndex = input<number, NumberInput>(0, {
    transform: value => numberAttribute(value, 0),
  });

  readonly role = input<string | null>();
  readonly type = input<string | null>();

  constructor() {
    resolve(Button, {
      disabled: computed(() => this.disabled() || this.loading()),
      focusableWhenDisabled: this.loading,
      tabIndex: this.tabIndex,
      role: this.role,
      type: this.type,
    });
  }

  readonly terseButton = input<TerseButtonVariants['variant'] | ''>();
  readonly size = input<TerseButtonVariants['size']>();

  readonly class = input<ClassValue>();
  readonly classValue = computed(() =>
    cn(
      terseButtonVariants({
        variant: this.terseButton() || 'default',
        size: this.size(),
        class: this.class(),
      }),
    ),
  );

  readonly lucideLoaderCircle = toTerseIcon('Loader Circle', lucideLoaderCircle);
}
