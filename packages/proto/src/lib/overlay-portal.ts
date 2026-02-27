import { DomPortalOutlet } from '@angular/cdk/portal';
import { ApplicationRef, DestroyRef, DOCUMENT, inject, InjectionToken } from '@angular/core';
import type { InjectorOptions } from '@terseware/proto/internal';
import { runInInjector } from '@terseware/proto/internal';

const PROTO_OVERLAY_PORTAL_ID = 'proto-overlay-portal';

export const OVERLAY_PORTAL = new InjectionToken<HTMLElement>('OVERLAY_PORTAL', {
  factory: () => {
    const document = inject(DOCUMENT);
    let portal = document.getElementById(PROTO_OVERLAY_PORTAL_ID);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = PROTO_OVERLAY_PORTAL_ID;
      portal.style.zIndex = '1000';
      portal.style.position = 'fixed';
      document.body.appendChild(portal);
    }
    return portal;
  },
});

export function createOverlayPortal(options: InjectorOptions = {}): DomPortalOutlet {
  return runInInjector(createOverlayPortal, options, ({ injector }) => {
    const outlet = new DomPortalOutlet(inject(OVERLAY_PORTAL), inject(ApplicationRef), injector);
    inject(DestroyRef).onDestroy(() => outlet.dispose());
    return outlet;
  });
}
