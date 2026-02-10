import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration()),
    provideBrowserGlobalErrorListeners(),
    provideRouter([
      {
        path: '',
        loadComponent: () => import('./home'),
      },
    ]),
  ],
};
