// import { inject } from '@angular/core';
// import { signalStore, signalStoreFeature, withFeature, withProps } from '@ngrx/signals';
// import { withStyleBinding } from '@terseware/proto/utils';
// import { AnchorRoot } from './anchor-root';

// export const AnchorTarget = signalStore(
//   withProps(() => ({ root: inject(AnchorRoot) })),
//   withFeature(store =>
//     signalStoreFeature(
//       withStyleBinding('position-anchor', store.root.anchorName),
//       withStyleBinding('position', () => 'fixed'),
//       withStyleBinding('position-try-fallbacks', () => 'flip-inline'),
//       withStyleBinding('position-area', store.root.placement),
//     ),
//   ),
// );
