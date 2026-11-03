import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Accion } from './permisos';
import { SesionService } from './sesion.service';

/** Páginas internas: sin sesión, al login (recordando a dónde iba). */
export const conSesion: CanActivateFn = (_r, estado) =>
  inject(SesionService).activa() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { volver: estado.url } });

/** Login, registro y recuperar: si ya hay sesión, al inicio. */
export const sinSesion: CanActivateFn = () =>
  !inject(SesionService).activa() || inject(Router).createUrlTree(['/inicio']);

/** Exige la acción indicada en data.accion. */
export const conPermiso: CanActivateFn = (ruta) =>
  inject(SesionService).puede(ruta.data['accion'] as Accion) ||
  inject(Router).createUrlTree(['/sin-permiso']);
