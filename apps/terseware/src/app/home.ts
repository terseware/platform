import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tw-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid-cols-8 grid container m-auto' },
  template: `
    <h1 class="col-span-4 container mx-auto p-6 text-4xl text-balance">
      Software for developers who refuse bloat.
    </h1>
  `,
})
export default class Home {}
