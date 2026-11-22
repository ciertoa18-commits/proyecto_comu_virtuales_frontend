import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionService } from './sesion.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SesionService).token();
  if (!token || !req.url.startsWith(environment.apiUrl) || req.url.includes('/auth/')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

/**
 * Si una petición responde 401, antes de sacar al usuario se confirma con GET /me que la sesión
 * de verdad venció. Así una ruta que el servidor todavía no tiene (por ejemplo, un backend sin
 * reiniciar) muestra un aviso en vez de cerrar la sesión.
 */
export const sesionVencidaInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  // HttpBackend evita pasar otra vez por los interceptores (no se repite este mismo control)
  const directo = new HttpClient(inject(HttpBackend));
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status !== 401 || req.url.includes('/auth/') || !sesion.activa()) return throwError(() => e);
      const token = sesion.token();
      return directo.get(`${environment.apiUrl}/me`, { headers: { Authorization: `Bearer ${token}` } }).pipe(
        map(() => true),
        catchError((v: HttpErrorResponse) => of(v.status !== 401)),
        switchMap((sigueActiva) => {
          if (!sigueActiva) {
            sesion.terminar('vencio', router.url);
            return throwError(() => e);
          }
          return throwError(
            () =>
              new HttpErrorResponse({
                status: 404,
                url: e.url ?? undefined,
                error: {
                  codigo: 'NO_DISPONIBLE',
                  mensaje: 'Esta función todavía no está disponible en el servidor. Reinicia el backend e inténtalo de nuevo.',
                },
              }),
          );
        }),
      );
    }),
  );
};
