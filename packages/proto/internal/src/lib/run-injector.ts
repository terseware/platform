import type { InjectOptions } from '@angular/core';
import {
  assertInInjectionContext,
  ElementRef,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { injectElementRef } from './element-ref';

export type InjectorOptions = Omit<InjectOptions, 'optional'> & {
  injector?: Injector | null | undefined;
};

export function runInInjector<T>(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  fn: Function,
  options: ElementInjectorOptions | null | undefined,
  runner: (context: { injector: Injector }) => T,
): T {
  let injector = options?.injector;

  if (!injector) {
    assertInInjectionContext(fn);
  }

  injector = injector ?? inject(Injector, { ...options, optional: false });

  return runInInjectionContext(injector, () => {
    return runner({ injector });
  });
}

export type ElementInjectorOptions<E = HTMLElement> = InjectorOptions & {
  element?: E | ElementRef<E> | null | undefined;
};

export function runInElementInjector<T, E = HTMLElement>(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  fn: Function,
  options: ElementInjectorOptions<E> | null | undefined,
  runner: (context: { element: E; elementRef: ElementRef<E>; injector: Injector }) => T,
): T {
  let injector = options?.injector;
  let elementRef: ElementRef<E>;

  if (!injector) {
    assertInInjectionContext(fn);
  }

  injector = injector ?? inject(Injector, { ...options, optional: false });

  if (options?.element) {
    elementRef =
      options.element instanceof ElementRef ? options.element : new ElementRef<E>(options.element);

    injector = Injector.create({
      providers: [{ provide: ElementRef, useValue: elementRef }],
      parent: injector,
    });
  }

  return runInInjectionContext(injector, () => {
    elementRef = elementRef ?? injectElementRef();
    return runner({ element: elementRef.nativeElement, elementRef, injector });
  });
}
