// import { effect } from '@angular/core';
// import {
//   patchState,
//   signalMethod,
//   signalStore,
//   signalStoreFeature,
//   withFeature,
//   withHooks,
//   withMethods,
//   withProps,
//   withState,
// } from '@ngrx/signals';
// import { injectElementRef, withAttrBinding, withEventListener } from '@terseware/proto/utils';

// // ── Global touch detection ──────────────────────────────────────────────────
// // Tracks whether the last interaction was touch-based. After a touch event,
// // the flag stays true for 50ms to suppress the emulated mouseenter that iOS
// // fires immediately after a pointerup/touchend.

// let _isTouchDevice = false;
// let _touchTimeout: ReturnType<typeof setTimeout> | undefined;

// function onGlobalPointerUp(event: PointerEvent): void {
//   if (event.pointerType !== 'touch') return;
//   _isTouchDevice = true;
//   clearTimeout(_touchTimeout);
//   _touchTimeout = setTimeout(() => {
//     _isTouchDevice = false;
//   }, 50);
// }

// if (typeof document !== 'undefined') {
//   document.addEventListener('pointerup', onGlobalPointerUp, { capture: true, passive: true });
// }

// export const HoverInteraction = signalStore(
//   withState({
//     disabled: false,
//     isHovered: false,
//   }),
//   withProps(() => ({
//     _elementRef: injectElementRef(),
//   })),
//   withMethods(store => ({
//     setDisabled: signalMethod((v: boolean) => patchState(store, { disabled: v })),
//   })),
//   withFeature(store =>
//     signalStoreFeature(
//       withAttrBinding('data-hover', () => (store.isHovered() ? '' : null)),
//       withEventListener('mouseenter', () => {
//         if (store.disabled() || _isTouchDevice) return;
//         patchState(store, { isHovered: true });
//       }),
//       withEventListener('mouseleave', () => {
//         if (_isTouchDevice) return;
//         patchState(store, { isHovered: false });
//       }),
//     ),
//   ),
//   withHooks({
//     onInit(store) {
//       effect(() => {
//         if (store.disabled()) {
//           patchState(store, { isHovered: false });
//         }
//       });
//     },
//   }),
// );
