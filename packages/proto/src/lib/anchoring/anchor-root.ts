// import { computed } from '@angular/core';
// import {
//   patchState,
//   signalMethod,
//   signalStore,
//   withComputed,
//   withMethods,
//   withState,
// } from '@ngrx/signals';
// import { uniqueId } from '@terseware/proto/utils';

// export const AnchorRoot = signalStore(
//   withState({
//     anchorId: uniqueId('anchor'),
//     offset: 8,
//     showDelay: 0,
//     hideDelay: 0,
//     placement: 'bottom center',
//   }),
//   withComputed(store => ({
//     anchorName: computed(() => `--${store.anchorId()}`),
//   })),
//   withMethods(store => ({
//     setAnchorId: signalMethod((anchorId: string) => patchState(store, { anchorId })),
//     setPlacement: signalMethod((placement: string) => patchState(store, { placement })),
//     setOffset: signalMethod((offset: number) => patchState(store, { offset })),
//     setShowDelay: signalMethod((showDelay: number) => patchState(store, { showDelay })),
//     setHideDelay: signalMethod((hideDelay: number) => patchState(store, { hideDelay })),
//   })),
// );
