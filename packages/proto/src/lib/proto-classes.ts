import { HostAttributeToken, inject } from '@angular/core';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { SignalSet } from 'ngxtension/collections';
import { twMerge } from 'tailwind-merge';
import { ProtoHost } from './proto-host';
import { Resolvable } from './proto-resolve';

@Resolvable()
export class ProtoClasses {
  readonly #host = inject(ProtoHost);
  readonly #baseClasses = inject(new HostAttributeToken('class'), { optional: true }) || '';
  readonly #classes = new SignalSet<() => ClassValue[] | string>();

  add(classes: () => ClassValue[] | string): () => void {
    this.#classes.add(classes);
    return () => this.#classes.delete(classes);
  }

  constructor() {
    this.#host.bindAttr(
      'class',
      () =>
        twMerge(
          clsx(
            [...this.#classes.values()].map(classes => classes()),
            this.#baseClasses,
          ),
        ) || null,
    );
  }
}
