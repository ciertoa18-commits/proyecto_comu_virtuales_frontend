import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-PE';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { rutas } from './app.routes';
import { sesionVencidaInterceptor, tokenInterceptor } from './core/sesion/interceptores';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    provideHttpClient(withInterceptors([tokenInterceptor, sesionVencidaInterceptor])),
    provideRouter(rutas, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
  ],
};
