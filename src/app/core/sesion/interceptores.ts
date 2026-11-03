import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionService } from './sesion.service';

/** Agrega "Authorization: Bearer <token>" solo a las llamadas a nuestra API. */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SesionService).token();
  if (!token || !req.url.startsWith(environment.apiUrl) || req.url.includes('/auth/')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

/** Si el backend responde 401 (token vencido o revocado), se cierra la sesión. */
export const sesionVencidaInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && !req.url.includes('/auth/') && sesion.activa()) {
        sesion.terminar('vencio', router.url);
      }
      return throwError(() => e);
    }),
  );
};
