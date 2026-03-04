import type { Injector } from '@angular/core';
import { inject, InjectionToken } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';

const uniqueIdMap = new InjectionToken<Map<string, number>>('uniqueIdMap', {
  factory: () => new Map<string, number>(),
});

/** Generate a unique id for an element. */
export function uniqueId<const T extends string>(
  prefix: T,
  injector?: Injector | null | undefined,
): `proto-${T}-${number}` {
  return assertInjector(uniqueId, injector, () => {
    const map = inject(uniqueIdMap);
    const id = map.get(prefix) ?? 0;
    map.set(prefix, id + 1);
    return `proto-${prefix}-${id}` as const;
  });
}
