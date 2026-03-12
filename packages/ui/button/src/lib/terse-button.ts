import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle } from '@ng-icons/lucide';
import { ButtonBehavior } from '@terseware/proto/button';
import { FocusProto } from '@terseware/proto/focus';
import { HoverProto } from '@terseware/proto/hover';
import { Press } from '@terseware/proto/press';
import { classes, isUndefined, signalBind } from '@terseware/utils';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export const terseButtonVariants = cva(
  'group/button data-focus-visible:ring-ring/70 inline-flex shrink-0 items-center justify-center rounded-md bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors duration-300 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-focus-visible:ring-3 data-press:duration-0 [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:1rem]',
  {
    variants: {
      variant: {
        unset: '',
        default:
          'bg-primary text-on-primary not-data-disabled:shadow-s data-hover:bg-primary-hover data-press:bg-primary-press',
        secondary:
          'bg-surface-light text-on-surface data-hover:bg-surface-hover data-press:bg-surface-light-hover',
        outline:
          'border-border data-hover:bg-surface-hover bg-surface [&_ng-icon:not([class*="text"])]:text-on-surface-muted border',
        ghost: 'data-hover:bg-surface-hover [&_ng-icon:not([class*="text"])]:text-on-surface-muted',
        link: 'text-primary [&_ng-icon:not([class*="text"])]:text-on-surface-muted underline-offset-4 data-hover:underline',
        'menu-item':
          "data-hover:bg-surface-hover data-active:bg-surface-hover data-focus-visible:bg-surface-hover [&_ng-icon:not([class*='text-'])]:text-primary aria-current:bg-surface-hover justify-start text-left",
        elevated:
          'bg-surface-light data-hover:bg-surface-light-hover not-data-disabled:shadow-s [&_ng-icon:not([class*="text"])]:text-on-surface-muted',
        danger:
          'bg-danger/10 data-focus-visible:ring-danger/20 text-danger data-focus-visible:border-danger/40 data-hover:bg-danger/20',
      },
      size: {
        unset: '',
        default:
          'h-9 gap-2 px-3 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: 'h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:0.75rem]',
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-3 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-2.5 px-3 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:1.25rem]',
        icon: 'size-9 [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:1.25rem]',
        'icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:1rem]',
        'icon-lg': 'size-10 [&_ng-icon:not(--ng-icon__size)]:[--ng-icon__size:1.5rem]',
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
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideLoaderCircle })],
  host: {
    'data-slot': 'button',
    '[aria-label]': "loading() ? 'Loading, please wait' : null",
  },
  template: `
    @if (loading()) {
      <ng-icon class="animate-spin" name="lucideLoaderCircle" />
    }
    <ng-content />
  `,
})
export class TerseButton {
  readonly button = inject(ButtonBehavior);
  readonly hover = inject(HoverProto);
  readonly press = inject(Press);
  readonly focus = inject(FocusProto);

  readonly disabled = input<boolean, BooleanInput>(undefined, {
    transform: booleanAttribute,
  });

  readonly loading = input<boolean, BooleanInput>(undefined, {
    transform: booleanAttribute,
  });

  readonly tabIndex = input<number, NumberInput>(undefined, {
    transform: value => (isUndefined(value) ? undefined : numberAttribute(value, 0)),
  });

  readonly role = input<string | null>();
  readonly type = input<string | null>();

  constructor() {
    signalBind(this.button.interact.disabled, () => this.disabled() || this.loading());
    signalBind(this.button.interact.focusableWhenDisabled, () => this.loading());
    signalBind(this.button.interact.tabIndex, this.tabIndex);
    signalBind(this.button.role, this.role);
    signalBind(this.button.type, this.type);

    signalBind(this.hover.disabled, this.button.interact.disabled);
    signalBind(this.press.disabled, this.button.interact.disabled);
    signalBind(this.focus.disabled, this.button.interact.hardDisabled); // Allow focus when focusable when disabled is true

    classes(() =>
      terseButtonVariants({
        variant: this.terseButton() || 'default',
        size: this.size(),
      }),
    );
  }

  readonly terseButton = input<TerseButtonVariants['variant'] | ''>();
  readonly size = input<TerseButtonVariants['size']>();
}
