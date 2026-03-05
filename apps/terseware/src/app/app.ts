import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import {
  ProtoFieldDescription,
  ProtoFieldError,
  ProtoFieldLabel,
  ProtoFormField,
} from '@terseware/proto/forms';
import { TerseButton } from '@terseware/ui/button';
import { TerseIcon, toTerseIcon } from '@terseware/ui/icon';
import { TerseThemeToggle } from '@terseware/ui/theme';

@Component({
  selector: 'tw-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    ProtoButton,
    ProtoFieldDescription,
    ProtoFieldError,
    ProtoFieldLabel,
    ProtoFormField,
    RouterLink,
    RouterOutlet,
    TerseIcon,
    TerseThemeToggle,
    TerseButton,
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
    <form [formRoot]="form">
      @if (show()) {
        <label protoFieldLabel [for]="form.name">Name</label>
        <input proto [formField]="form.name" />
        <input proto type="number" [formField]="form.tabIndex" />
        <p [protoFieldDescription]="form.name"></p>
        <p [protoFieldDescription]="form.name"></p>
        @for (error of form.name().errors(); track error) {
          <p [protoFieldError]="error">{{ error.message }}</p>
        }
        <button terseButton type="submit">Submit</button>
      }

      <button terseButton type="submit" (click)="show.set(!show())">Toggle</button>
    </form>
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

  readonly show = signal(true);
  readonly form = form(
    signal({ name: 'James', tabIndex: 0 }),
    path => {
      required(path.name, { message: 'Name is required' });
    },
    {
      submission: {
        action: async () => {
          console.log('submission');
          return null;
        },
      },
    },
  );
}
