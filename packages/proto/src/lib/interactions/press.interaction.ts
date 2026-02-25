// import { effect, inject, Renderer2 } from '@angular/core';
// import {
//   patchState,
//   signalMethod,
//   signalStore,
//   signalStoreFeature,
//   withFeature,
//   withHooks,
//   withMethods,
//   withState,
// } from '@ngrx/signals';
// import { injectElementRef, withAttrBinding, withEventListener } from '@terseware/proto/utils';

// export const PressInteraction = signalStore(
//   withState({ disabled: false, isPressed: false }),
//   withMethods(store => ({
//     setDisabled: signalMethod((v: boolean) => patchState(store, { disabled: v })),
//   })),
//   withFeature(store => {
//     let activePointerId: number | null = null;
//     const renderer = inject(Renderer2);
//     const elementRef = injectElementRef();
//     return signalStoreFeature(
//       withAttrBinding('data-press', () => (store.isPressed() ? '' : null)),
//       withEventListener(
//         'pointerdown',
//         event => {
//           if (store.disabled() || event.button !== 0) return;
//           activePointerId = event.pointerId;
//           patchState(store, { isPressed: true });

//           const doc = elementRef.nativeElement.ownerDocument;

//           const removeUp = renderer.listen(doc, 'pointerup', e => {
//             if (e.pointerId !== activePointerId) return;
//             release();
//           });

//           const removeCancel = renderer.listen(doc, 'pointercancel', e => {
//             if (e.pointerId !== activePointerId) return;
//             release();
//           });

//           const release = (): void => {
//             activePointerId = null;
//             patchState(store, { isPressed: false });
//             removeUp();
//             removeCancel();
//           };
//         },
//         { capture: true },
//       ),
//     );
//   }),
//   withHooks({
//     onInit(store) {
//       effect(() => {
//         if (store.disabled()) {
//           patchState(store, { isPressed: false });
//         }
//       });
//     },
//   }),
// );
