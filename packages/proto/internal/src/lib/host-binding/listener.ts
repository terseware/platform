import { DestroyRef, DOCUMENT, inject, Renderer2 } from '@angular/core';
import type { ElementInjectorOptions } from '../run-injector';
import { runInElementInjector } from '../run-injector';
import { isBoolean } from '../validators';

export type ListenerOpts =
  | (ElementInjectorOptions & {
      document: true;
      element?: undefined;
      config?: AddEventListenerOptions | boolean | null | undefined;
    })
  | (ElementInjectorOptions & {
      document?: false;
      config?: AddEventListenerOptions | boolean | null | undefined;
    });

export function listener<const K extends keyof HTMLElementEventMap>(
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: ListenerOpts,
): () => void {
  return runInElementInjector(listener, options, ({ element }) => {
    const renderer = inject(Renderer2);
    const destroyRef = inject(DestroyRef);
    const config = options?.config;
    const rmListen = renderer.listen(
      options?.document ? inject(DOCUMENT) : element,
      event,
      handler,
      isBoolean(config)
        ? { capture: true }
        : {
            ...config,
            // Default to capture if document unless otherwise specified
            capture: config?.capture ?? options?.document === true,
          },
    );
    const rmDestroy = destroyRef.onDestroy(() => rmListen());
    return () => {
      rmListen();
      rmDestroy();
    };
  });
}
