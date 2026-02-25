import {
  inject,
  Injector,
  isDevMode,
  isSignal,
  runInInjectionContext,
  type Signal,
} from '@angular/core';
import { attrBinding, injectElementRef, isFunction, listener } from '@terseware/proto/utils';

export type ProtoPatternOptions = {
  /**
   * The element to apply the pattern to.
   * @default injectElementRef().nativeElement
   */
  readonly element?: HTMLElement;
  /**
   * The injector to use for the pattern.
   * @default inject(Injector)
   */
  readonly injector?: Injector;
  /**
   * Whether to automatically setup listeners for the pattern.
   * @default true
   */
  readonly autoSetupListeners?: boolean;
  /**
   * Whether to automatically bind attributes for the pattern.
   * @default true
   */
  readonly autoBindAttributes?: boolean;
};

export type ProtoPatternPatternFields<T> = {
  readonly [K in keyof T as K extends `attr.${string}` ? K : never]: Signal<
    string | null | undefined
  >;
} & {
  readonly [K in keyof T as K extends `evt.${keyof HTMLElementEventMap & string}`
    ? K
    : never]: K extends `evt.${infer E extends keyof HTMLElementEventMap}`
    ? (event: HTMLElementEventMap[E]) => void
    : never;
};

export type ProtoPatternListenerConfig<
  K extends keyof HTMLElementEventMap = keyof HTMLElementEventMap,
> = {
  eventName: K;
  readonly callback: (event: HTMLElementEventMap[K]) => void;
  readonly options?: AddEventListenerOptions | boolean;
};

export abstract class ProtoPatternBase {
  protected readonly element: HTMLElement;
  protected readonly injector: Injector;

  constructor(protected readonly options: ProtoPatternOptions) {
    this.injector = options.injector ?? inject(Injector);

    this.element =
      options.element ??
      runInInjectionContext(this.injector, () => injectElementRef().nativeElement);

    queueMicrotask(() => {
      runInInjectionContext(this.injector, () => {
        const instanceKeys = Object.keys(this);
        const protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(
          k => k !== 'constructor',
        );
        const allKeys = [...instanceKeys, ...protoKeys];

        if (options.autoSetupListeners ?? true) {
          for (const key of allKeys) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (this as any)[key];
            if (key.startsWith('evt.')) {
              if (isFunction(value)) {
                listener(
                  this.element,
                  key.slice(4),
                  value.bind(this) as (
                    event: HTMLElementEventMap[keyof HTMLElementEventMap],
                  ) => void,
                  { injector: this.injector },
                );
              } else if (isDevMode()) {
                // eslint-disable-next-line no-console
                console.warn(`ProtoPatternBase: ${key} is not a function`);
              }
            }
          }
        }

        if (options.autoBindAttributes ?? true) {
          for (const key of allKeys) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (this as any)[key];
            if (key.startsWith('attr.')) {
              if (isSignal(value)) {
                attrBinding(key as `attr.${string}`, value as () => string);
              } else if (isDevMode()) {
                // eslint-disable-next-line no-console
                console.warn(`ProtoPatternBase: ${key} is not a signal`);
              }
            }
          }
        }
      });
    });
  }
}
