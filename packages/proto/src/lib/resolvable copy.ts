// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable no-bitwise */
// import type { Type, TypeDecorator } from '@angular/core';
// import {
//   ElementRef,
//   inject,
//   InjectionToken,
//   Injector,
//   runInInjectionContext,
//   untracked,
// } from '@angular/core';
// import { getInj, uniqueNumber } from '@terseware/utils';

// const refStackToken = new InjectionToken('RESOLVABLE_REF_STACK', { factory: () => [] as object[] });

// export const RESOLVABLE_REF = new InjectionToken('RESOLVABLE_REF');
// Object.defineProperty(RESOLVABLE_REF, '__NG_ELEMENT_ID__', {
//   writable: true,
//   value: (_flags: number): object | null => inject(refStackToken).at(-1) ?? null,
// });

// export type ResolvableOptions = {
//   /**
//    * Whether to inherit the resolvable instance from the parent injector.
//    * - `true`: Resolve the instance from the host or any parent.
//    * - `false`: Resolve the instance from the host only.
//    * @default false
//    */
//   inherit?: boolean;

//   /**
//    * A function that is used for lookup where to resolve the instance in.
//    * Must return a stable, unique object spanning the DI tree.
//    * A good example is `() => inject(ElementRef).nativeElement`
//    * since a DOM element is a stable, unique object.
//    *
//    * @default () => inject(ElementRef).nativeElement
//    */
//   ref?: () => object;
// };

// /**
//  * Decorator that marks a class as dynamically resolvable via DI or in the DOM tree
//  * using an ambient dependency injection algorithm.
//  *
//  * @remarks
//  * Hooks into Angular's `__NG_ELEMENT_ID__` protocol so that `inject(MyResolvable)`
//  * participates in normal element-injector resolution. Instances are cached per reference
//  * object (default: host element), so multiple directives on the same element share one
//  * instance.
//  */
// export function Resolvable(options?: ResolvableOptions): TypeDecorator {
//   return function (base: any) {
//     class R extends base {
//       static __NG_ELEMENT_ID__ = (flags: number): R | null => {
//         const skipSelf = !!(flags & 4);
//         const self = !!(flags & 2);
//         const host = !!(flags & 1);

//         // if (base.name.toLowerCase().includes('menuctx')) {
//         //   debugger;
//         // }

//         const injector = inject(Injector, { self, host, skipSelf });

//         return untracked(() => {
//           let injTraverse: Injector | null = injector;

//           while (injTraverse) {
//             const ref = runInInjectionContext(injTraverse, () => {
//               try {
//                 return (options?.ref ?? (() => inject(ElementRef).nativeElement))();
//               } catch {
//                 return null;
//               }
//             });
//             if (ref) {
//               const map = getInstanceMap<R>(ref);
//               if (map.has(R)) {
//                 return map.get(R) as R;
//               }
//             }

//             if (!base.name.toLowerCase().includes('menuctx')) {
//               // Non-inherited resolution stops after the first injector.
//               if (!options?.inherit || self || host) break;
//             }

//             const parentOpts = { optional: true, skipSelf: true };
//             const parent = injTraverse.get(Injector, null, parentOpts) as Injector | null;
//             injTraverse = parent === injTraverse ? null : parent;
//           }

//           // SkipSelf-only injection: never create, only look up.
//           if (skipSelf) {
//             return null;
//           }

//           // No existing instance found — create one in ref's node injector so that
//           // inject() calls inside the constructor resolve from the correct element context.
//           const ref = runInInjectionContext(injector, () =>
//             (options?.ref ?? (() => inject(ElementRef).nativeElement))(),
//           );

//           // Prefer ref's own injector so node-scoped tokens (ElementRef, CDRef, etc.) resolve
//           // correctly. Fall back to the current injector if ref has no lView (e.g. plain object).
//           const targetInjector = getInj(ref, { injector, optional: true }) ?? injector;

//           return runInInjectionContext(targetInjector, () => {
//             const refStack = inject(refStackToken);
//             refStack.push(ref);
//             try {
//               const instance = new R();
//               const id = uniqueNumber(base.name);
//               getInstanceMap(ref).set(R, instance);
//               (instance as any).__RESOLVABLE_REF__ = ref;
//               ((ref as any)['__RESOLVABLE_INSTANCES__'] ??= {})[id] = instance;
//               return instance;
//             } catch (error) {
//               console.error(error);
//               throw error;
//             } finally {
//               refStack.pop();
//             }
//           });
//         });
//       };
//     }

//     Object.defineProperty(R, 'name', { value: base.name });
//     Object.defineProperty(R.prototype, Symbol.toStringTag, {
//       value: `${base.name}_Resolvable`,
//       configurable: true,
//     });

//     return R;
//   };
// }

// // const RESOLVABLE_INSTANCE_CACHE = new InjectionToken('RESOLVABLE_INSTANCE_CACHE', {
// //   factory: () => new WeakMap<object, Map<Type<any>, any>>(),
// // });

// const cache = new WeakMap<object, Map<Type<any>, any>>();

// function getInstanceMap<T>(ref: object): Map<Type<T>, T> {
//   // const cache = inject(RESOLVABLE_INSTANCE_CACHE);
//   let map = cache.get(ref);
//   if (!map) {
//     map = new Map();
//     cache.set(ref, map);
//   }
//   return map as Map<Type<T>, T>;
// }
