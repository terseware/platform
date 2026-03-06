import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import {
  FormCtx,
  ProtoField,
  ProtoFieldDescription,
  ProtoFieldError,
  ProtoFieldLabel,
  resolver,
} from '@terseware/proto/forms';
import { Interact } from '@terseware/proto/interact';
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
    ProtoField,
    RouterLink,
    RouterOutlet,
    TerseIcon,
    TerseThemeToggle,
    TerseButton,
  ],
  providers: [FormCtx],
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
        <input protoField [formField]="form.name" />
        <input protoField type="number" [formField]="form.tabIndex" />
        <p [protoFieldDescription]="form.name"></p>
        <p [protoFieldDescription]="form.name"></p>
        @for (error of form.name().errors(); track error) {
          <p [protoFieldError]="error">{{ error.message }}</p>
        }
        <button terseButton type="submit">Submit</button>
      }

      <button terseButton (click)="show.set(!show())">Toggle</button>
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
      resolver(path.tabIndex, Interact, ctx => {
        ctx.instance.tabIndex.set(ctx.value());
      });
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
