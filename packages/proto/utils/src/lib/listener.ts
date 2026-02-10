import { coerceElement } from '@angular/cdk/coercion';
import type { ElementRef, Injector } from '@angular/core';
import { inject, Renderer2, runInInjectionContext } from '@angular/core';
import { assertInjector } from 'ngxtension/assert-injector';
import { isBoolean } from './validators';

/** Registers an event listener outside Angular's zone. Cleans up automatically on destroy. */
export function listener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | ElementRef<HTMLElement> | Document,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: { injector?: Injector; config?: AddEventListenerOptions | boolean },
): () => void;

export function listener(
  element: HTMLElement | ElementRef<HTMLElement> | Document,
  event: string,
  handler: (event: Event) => void,
  options?: { injector?: Injector; config?: AddEventListenerOptions | boolean },
): () => void;

export function listener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | ElementRef<HTMLElement> | Document,
  event: K | string,
  handler: (event: HTMLElementEventMap[K] | Event) => void,
  options?: { injector?: Injector; config?: AddEventListenerOptions | boolean },
): () => void {
  return runInInjectionContext(assertInjector(listener, options?.injector), () => {
    const nativeElement = coerceElement(element);
    const renderer = inject(Renderer2);
    const config = options?.config;
    return renderer.listen(
      nativeElement,
      event,
      handler,
      isBoolean(config)
        ? { capture: true }
        : {
            capture: config?.capture ?? false,
            once: config?.once ?? false,
            passive: config?.passive ?? false,
          },
    );
  });
}
