// import type { EffectRef, ListenerOptions, Signal } from '@angular/core';
// import { computed, inject, Renderer2, RendererStyleFlags2 } from '@angular/core';
// import type { SignalStoreFeatureResult } from '@ngrx/signals';
// import { withComputed, withMethods } from '@ngrx/signals';
// import { injectElementRef } from './element-ref';
// import { isomorphicEffect } from './isomorphic';
// import { unwrap } from './util';
// import { isNull, isUndefined } from './validators';

// /**
//  * Binds an attribute to a signal.
//  * `undefined` does nothing
//  * `null` removes the attribute
//  * `string` sets the attribute
//  */
// export function attrBinding(
//   binding: `attr.${string}`,
//   value: () => string | null | undefined,
// ): EffectRef {
//   const elementRef = injectElementRef();
//   const renderer = inject(Renderer2);
//   const prop = computed(() => binding.slice(5));
//   return isomorphicEffect({
//     earlyRead: computed(() => value()),
//     write: sourceSig => {
//       const source = sourceSig();
//       if (!isUndefined(source)) {
//         if (isNull(source)) {
//           renderer.removeAttribute(elementRef.nativeElement, prop());
//         } else {
//           renderer.setAttribute(elementRef.nativeElement, prop(), String(source));
//         }
//       }
//     },
//   });
// }

// // /**
// //  * Binds an attribute to a signal.
// //  * `undefined` does nothing
// //  * `null` removes the attribute
// //  * `string` sets the attribute
// //  */
// // // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// // export function withAttrBinding<
// //   Input extends SignalStoreFeatureResult,
// //   const Prop extends string,
// //   const Val extends string | null | undefined,
// // >(prop: Prop, value: () => Val) {
// //   return withComputed<Input, Record<`attr.${Prop}`, Signal<Val>>>(() => {
// //     const source = computed(() => unwrap(value));
// //     attrBinding(prop, source);
// //     return { [`attr.${prop}`]: source } as Readonly<Record<`attr.${Prop}`, Signal<Val>>>;
// //   });
// // }

// // /**
// //  * Binds an event listener to a signal.
// //  */
// // // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// // export function withEventListener<
// //   Input extends SignalStoreFeatureResult,
// //   const K extends keyof HTMLElementEventMap,
// // >(event: K, handler: (event: HTMLElementEventMap[K]) => void, config?: ListenerOptions) {
// //   return withMethods<Input, Record<`event.${K}`, () => void>>(() => {
// //     const renderer = inject(Renderer2);
// //     return {
// //       [`event.${event}`]: renderer.listen(injectElementRef().nativeElement, event, handler, config),
// //     } as Readonly<Record<`event.${K}`, () => void>>;
// //   });
// // }

// // export function styleBinding(prop: string, value: () => string | null | undefined): EffectRef {
// //   const elementRef = injectElementRef();
// //   const renderer = inject(Renderer2);
// //   return isomorphicEffect({
// //     earlyRead: computed(() => unwrap(value)),
// //     write: sourceSig => {
// //       const source = sourceSig();
// //       const flags = prop.startsWith('--') ? RendererStyleFlags2.DashCase : undefined;
// //       if (!isUndefined(source)) {
// //         if (isNull(source)) {
// //           renderer.removeStyle(elementRef.nativeElement, prop, flags);
// //         } else {
// //           renderer.setStyle(elementRef.nativeElement, prop, String(source), flags);
// //         }
// //       }
// //     },
// //   });
// // }

// // // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
// // export function withStyleBinding<
// //   Input extends SignalStoreFeatureResult,
// //   const Prop extends string,
// //   const Val extends string | null | undefined,
// // >(prop: Prop, value: () => Val) {
// //   return withComputed<Input, Record<`style.${Prop}`, Signal<Val>>>(() => {
// //     const source = computed(() => unwrap(value));
// //     styleBinding(prop, source);
// //     return { [`style.${prop}`]: source } as Readonly<Record<`style.${Prop}`, Signal<Val>>>;
// //   });
// // }
