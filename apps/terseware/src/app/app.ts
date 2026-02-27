import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import { ProtoLazyScrollable } from '@terseware/proto/scrolling';
import type { TooltipSide } from '@terseware/proto/tooltip';
import { hostBinding } from '@terseware/proto/utils';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { TerseThemeToggle } from '@terseware/ui/theme';

@Component({
  selector: 'tw-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    TerseThemeToggle,
    TerseIcon,
    ProtoButton,
    ProtoLazyScrollable,
  ],
  host: { class: 'contents' },
  template: `
    <header class="bg-surface flex h-16 items-center px-4 py-3">
      <a class="inline-flex items-center" protoButton terseTooltip="Home" [routerLink]="['/']">
        @if (logoIcon(); as logoIcon) {
          <svg class="text-primary size-8" fill="currentColor" [terseIcon]="logoIcon"></svg>
        }
        <span class="font-mono text-lg tracking-wide"
          ><span class="mr-px font-semibold">terse</span
          ><span class="text-on-surface-muted">ware</span></span
        >
      </a>
      <span class="flex-1"></span>
      <terse-theme-toggle />
    </header>
    <div
      #scrollable="protoLazyScrollable"
      protoLazyScrollable
      style="min-height: 100px;
               max-height: 100px;
               min-width: 100px;
               max-width: 100px;
               overflow: auto;"
    >
      <div
        style="min-height: 200px;
                 max-height: 200px;
                 min-width: 200px;
                 max-width: 200px;"
      ></div>
    </div>
    {{ scrollable.lazyScrollTop() }}
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

  readonly side = signal<TooltipSide>('top');

  constructor() {
    hostBinding(
      '(keydown)',
      event => {
        if (event.key === 'ArrowUp') {
          this.side.set('top');
        }
        if (event.key === 'ArrowDown') {
          this.side.set('bottom');
        }
        if (event.key === 'ArrowLeft') {
          this.side.set('left');
        }
        if (event.key === 'ArrowRight') {
          this.side.set('right');
        }
      },
      { document: true },
    );
  }
}
