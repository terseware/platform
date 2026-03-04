import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { disabled, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ProtoButton } from '@terseware/proto/button';
import {
  ProtoFieldDescription,
  ProtoFieldError,
  ProtoFieldLabel,
  ProtoFormField,
  ProtoFormRoot,
  resolver,
} from '@terseware/proto/forms';
import { Interact } from '@terseware/proto/interact';
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
    ProtoFormRoot,
    RouterLink,
    RouterOutlet,
    TerseIcon,
    TerseThemeToggle,
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
    <form proto [formRoot]="form">
      @if (showLabel()) {
        <label protoFieldLabel [for]="form.name">Name</label>
      }
      <input proto [formField]="form.name" />
      <input proto type="number" [formField]="form.tabIndex" />
      @if (showDescription1()) {
        <p [protoFieldDescription]="form.name"></p>
      }
      @if (showDescription2()) {
        <p [protoFieldDescription]="form.name"></p>
      }
      @for (error of form.name().errors(); track error) {
        <p [protoFieldError]="error">{{ error.message }}</p>
      }
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

  readonly showLabel = signal(true);
  readonly showDescription1 = signal(true);
  readonly showDescription2 = signal(true);
  readonly form = form(signal({ name: 'James', tabIndex: 0 }), path => {
    resolver(path.tabIndex, Interact, { tabIndex: ctx => ctx.stateOf(path.tabIndex).value() });
    disabled(path.name, () => true);
    required(path.name, { message: 'Name is required' });
  });
}
