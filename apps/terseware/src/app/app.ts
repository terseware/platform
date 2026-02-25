import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import { ProtoTooltip, ProtoTooltipRoot, ProtoTooltipTrigger } from '@terseware/proto/tooltip';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { TerseThemeToggle } from '@terseware/ui/theme';

@Component({
  selector: 'tw-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TerseThemeToggle,
    TerseIcon,
    ProtoTooltipRoot,
    ProtoTooltipTrigger,
    ProtoTooltip,
    ProtoButton,
  ],
  host: { class: 'contents' },
  template: `
    <header class="bg-surface flex h-16 items-center px-4 py-3" protoTooltipRoot>
      @if (logoIcon(); as logoIcon) {
        <svg class="text-primary size-8" fill="currentColor" [terseIcon]="logoIcon"></svg>
      }
      <span class="font-mono text-lg tracking-wide"
        ><span class="mr-px font-semibold">terse</span
        ><span class="text-on-surface-muted">ware</span></span
      >
      <span class="flex-1"></span>
      <terse-theme-toggle disabled focusableWhenDisabled protoTooltipTrigger />
      <span protoTooltip>Tooltip</span>
      <div
        id="button"
        protoButton
        [disabled]="true"
        [focusableWhenDisabled]="focusableWhenDisabled()"
        (click)="console.log('button click')"
        (keydown)="console.log('button keydown', $event)"
      >
        <div
          class="m-6"
          id="div"
          protoButton
          [disabled]="false"
          [focusableWhenDisabled]="false"
          (click)="console.log('div click')"
          (keydown)="console.log('div keydown', $event)"
        >
          Loading...
        </div>
      </div>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {
  readonly logo = httpResource.text(() => 'terseware.svg');
  readonly logoIcon = computed(() =>
    this.logo.hasValue() ? toTerseIcon('Logo', this.logo.value() as `<svg ${string}`) : null,
  );

  console = console;

  readonly focusableWhenDisabled = signal(true);

  constructor() {
    setTimeout(() => {
      this.focusableWhenDisabled.set(false);
      console.log('focusableWhenDisabled set to false');
    }, 4000);
  }
}
