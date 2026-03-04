import type { InjectOptions, Injector } from '@angular/core';
import { DestroyRef, ElementRef, inject } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';

export type InjectorOpt = {
  injector?: Injector | null | undefined;
};

/**
 * Registers a callback to run when the current or given injector is destroyed.
 */
export function onDestroy(fn: () => void, injector?: Injector | null | undefined): () => void {
  return assertInjector(onDestroy, injector, () => inject(DestroyRef).onDestroy(fn));
}

/**
 * Injects typed element reference with explicit type parameter
 */
export function injectElementRef<T extends Element = HTMLElement>(
  options: InjectorOpt & InjectOptions & { optional: true },
): ElementRef<T> | null;
export function injectElementRef<T extends Element = HTMLElement>(
  options?: InjectorOpt & InjectOptions & { optional?: boolean },
): ElementRef<T>;
export function injectElementRef<T extends Element = HTMLElement>(
  options?: InjectorOpt & InjectOptions & { optional?: boolean },
): ElementRef<T> | null {
  return assertInjector(injectElementRef, options?.injector, () =>
    inject<ElementRef<T>>(ElementRef, options ?? {}),
  );
}

/**
 * Injects typed element with explicit type parameter
 */
export function injectElement<T extends Element = HTMLElement>(
  options: InjectorOpt & InjectOptions & { optional: true },
): T | null;
export function injectElement<T extends Element = HTMLElement>(
  options?: InjectorOpt & InjectOptions & { optional?: boolean },
): T;
export function injectElement<T extends Element = HTMLElement>(
  options?: InjectorOpt & InjectOptions & { optional?: boolean },
): T | null {
  return assertInjector(
    injectElement,
    options?.injector,
    () => injectElementRef<T>(options ?? {})?.nativeElement ?? null,
  );
}
