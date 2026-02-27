import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { hostBinding } from '@terseware/proto/utils';
import { Resolvable } from './resolvable';

type ArrayAttrMap = Record<symbol, string>;

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

  #arraySet(map: WritableSignal<ArrayAttrMap>, id: string): () => void {
    id = id.trim();
    const symbol = Symbol.for(id);
    map.update(ids => ({ ...ids, [symbol]: id }));
    return () => {
      map.update(ids => {
        const { [symbol]: _, ...rest } = ids;
        return rest;
      });
    };
  }

  #joinArray(map: ArrayAttrMap): string | null {
    return Object.values(map).filter(Boolean).join(' ') || null;
  }
}
