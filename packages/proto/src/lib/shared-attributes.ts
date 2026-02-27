import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { uniqueId } from '@terseware/proto/internal';
import { hostBinding } from '@terseware/proto/utils';
import { Resolvable } from './resolvable';

type ArrayAttrMap = Record<string, string>;

@Resolvable({ host: true })
export class SharedAttributes {
  readonly #ariaDescribedby = signal<ArrayAttrMap>({});
  ariaDescribedby(id: string): () => void {
    return this.#arraySet(this.#ariaDescribedby, id);
  }

  readonly #ariaLabelledBy = signal<ArrayAttrMap>({});
  ariaLabelledBy(id: string): () => void {
    return this.#arraySet(this.#ariaLabelledBy, id);
  }

  constructor() {
    hostBinding('attr.aria-describedby', () => this.#joinArray(this.#ariaDescribedby()));
    hostBinding('attr.aria-labelledby', () => this.#joinArray(this.#ariaLabelledBy()));
  }

  #arraySet(map: WritableSignal<ArrayAttrMap>, value: string): () => void {
    value = value.trim();
    const id = uniqueId('shared-attribute');
    map.update(ids => ({ ...ids, [id]: value }));
    return () => {
      map.update(ids => {
        const { [id]: _, ...rest } = ids;
        return rest;
      });
    };
  }

  #joinArray(map: ArrayAttrMap): string | null {
    return Object.values(map).filter(Boolean).join(' ') || null;
  }
}
