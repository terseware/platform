import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { deepComputed } from '@ngrx/signals';
import { uniqueId } from '@terseware/proto/internal';
import { cn } from '@terseware/ui/utils';
import type { ClassValue } from 'clsx';

export type TerseIconData = {
  name: string;
  svg: `<svg ${string}`;
};

export function toTerseIcon(name: string, svg: `<svg ${string}`): TerseIconData {
  return { name, svg };
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'svg[terseIcon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.fill]': 'fill()',
    '[attr.stroke]': 'stroke()',
    '[attr.viewBox]': 'viewBox()',
    '[class]': 'classValue()',
    'data-slot': 'icon',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    focusable: 'false',
    role: 'img',
    xmlns: 'http://www.w3.org/2000/svg',
  },
  schemas: [NO_ERRORS_SCHEMA],
  template: `<g [innerHTML]="svgChildren()" />`,
})
export class TerseIcon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly id = uniqueId('terse-icon');

  readonly terseIcon = input.required<TerseIconData>();
  protected readonly data = deepComputed(() => this.terseIcon());

  readonly svgChildren = computed(() => {
    const svg = this.data.svg();
    const match = [...svg.matchAll(/<svg.*?>(.*?)<\s*\/svg\s*>/gs)];
    return this.sanitizer.bypassSecurityTrustHtml(match[0]?.[1] ?? '');
  });

  protected readonly viewBox = computed(() => {
    const svg = this.data.svg();
    const match = [...svg.matchAll(/<svg.*?viewBox="(.*?)"/gs)];
    return match[0]?.[1];
  });

  protected readonly fill = computed(() => {
    const svg = this.data.svg();
    const match = [...svg.matchAll(/<svg.*?fill="(.*?)"/gs)];
    return match[0]?.[1];
  });

  protected readonly stroke = computed(() => {
    const svg = this.data.svg();
    const match = [...svg.matchAll(/<svg.*?stroke="(.*?)"/gs)];
    return match[0]?.[1];
  });

  readonly class = input<ClassValue>();
  readonly classValue = computed(() => cn(this.class()));
}
