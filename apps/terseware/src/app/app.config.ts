import { provideHttpClient, withFetch } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import {
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideCheckNoChangesConfig,
} from '@angular/core';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideProtoEvents } from '@terseware/proto';
import { AppErrorHandler } from './app-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideProtoEvents(),
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideCheckNoChangesConfig({ exhaustive: true }),
    provideClientHydration(withIncrementalHydration()),
    provideHttpClient(withFetch()),
    provideRouter([
      {
        path: '',
        loadComponent: () => import('./home'),
      },
    ]),
  ],
};
