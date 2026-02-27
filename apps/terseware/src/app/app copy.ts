import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { TerseThemeToggle } from '@terseware/ui/theme';

@Component({
  selector: 'tw-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TerseThemeToggle, TerseIcon, ProtoButton],
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
      <terse-theme-toggle />
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
    <div class="grid flex-1 place-content-center">
      <div class="bg-surface-light grid size-100 place-content-center">
        <div class="anchor bg-primary size-20"></div>
        <div class="target">
          <div
            class="light bg-surface-light text-on-surface relative inline-block w-fit max-w-xs rounded-md px-2 py-1.5 text-xs text-balance"
          >
            My ToolTip
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .anchor {
      anchor-name: --anchor;
    }

    .target {
      position: absolute;
      container-type: anchored;
      block-size: anchor-size();
      inline-size: calc(100vw - anchor-size());
      inset-block-start: anchor(--anchor start);
      inset-inline-start: anchor(--anchor end);
    }
  `,
})
export class App {
  readonly logo = httpResource.text(() => 'terseware.svg');
  readonly logoIcon = computed(() =>
    this.logo.hasValue() ? toTerseIcon('Logo', this.logo.value() as `<svg ${string}`) : null,
  );

  console = console;

  readonly focusableWhenDisabled = signal(true);
}
