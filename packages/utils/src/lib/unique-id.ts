import type { Injector } from '@angular/core';
import { inject, InjectionToken } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';

const uniqueIdMap = new InjectionToken<Map<string, number>>('uniqueIdMap', {
  factory: () => new Map<string, number>(),
});

/** Generate a unique id for an element. */
export function uniqueId<const T extends string = 'proto'>(
  prefix?: T | undefined,
  injector?: Injector | null | undefined,
): `${T}-${number}` {
  return assertInjector(uniqueId, injector, () => {
    const map = inject(uniqueIdMap);
    prefix ||= 'proto' as T;
    const id = map.get(prefix) ?? 0;
    map.set(prefix, id + 1);
    return `${prefix}-${id}` as const;
  });
}

const uniqueNumberMap = new InjectionToken<Map<string | symbol, number>>('uniqueNumberMap', {
  factory: () => new Map<string, number>(),
});

const NO_PREFIX: unique symbol = Symbol('NO_PREFIX');

/** Generate a unique id for an element. */
export function uniqueNumber(
  prefix?: string | undefined,
  injector?: Injector | null | undefined,
): number {
  return assertInjector(uniqueNumber, injector, () => {
    const map = inject(uniqueNumberMap);
    const p = prefix || NO_PREFIX;
    const id = map.get(p) ?? 0;
    map.set(p, id + 1);
    return id;
  });
}
