import type { Injector } from '@angular/core';
import { runInInjectionContext } from '@angular/core';
import type { Args, MaybeFn } from './types';
import { isFunction } from './validators';

export function unwrap<T, A extends Args>(val: MaybeFn<T, A>, ...args: A): T {
  return isFunction(val) ? val(...args) : val;
}

export function unwrapInject<T, A extends Args>(inj: Injector, val: MaybeFn<T, A>, ...args: A): T {
  return runInInjectionContext(inj, () => unwrap(val, ...args));
}
