import type { Injector } from '@angular/core';
import { runInInjectionContext } from '@angular/core';
import { deepMerge } from './deep-merge/deep-merge';
import type { Args, DeepPartial, MaybeFn } from './types';
import { isFunction } from './validators';

export function unwrap<T, A extends Args>(val: MaybeFn<T, A>, ...args: A): T {
  return isFunction(val) ? val(...args) : val;
}

export function unwrapInject<T, A extends Args>(inj: Injector, val: MaybeFn<T, A>, ...args: A): T {
  return runInInjectionContext(inj, () => unwrap(val, ...args));
}

export function unwrapMerge<T extends object>(
  defaultValue: MaybeFn<T>,
  ...values: MaybeFn<DeepPartial<T> | undefined | null>[]
): T {
  return deepMerge(unwrap(defaultValue), ...values.map(x => unwrap(x) ?? {})) as T;
}

export function unwrapMergeInject<T extends object>(
  injector: Injector,
  defaultValue: MaybeFn<T>,
  ...values: MaybeFn<DeepPartial<T> | undefined | null>[]
): T {
  return deepMerge(
    unwrapInject(injector, defaultValue),
    ...values.map(v => unwrapInject(injector, v) ?? {}),
  ) as T;
}
