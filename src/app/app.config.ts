import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideJsonAdapters } from '@core/adapters/json';
import { provideI18n } from '@core/i18n/transloco.providers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // Incremental hydration: below-the-fold @defer blocks hydrate on demand.
    provideClientHydration(withIncrementalHydration()),
    provideI18n(),
    // Ports → adapters. The backend phase replaces this single line with
    // provideHttpAdapters(); no component changes.
    provideJsonAdapters(),
  ],
};
