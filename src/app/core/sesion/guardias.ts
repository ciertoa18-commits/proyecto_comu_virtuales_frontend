import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Accion } from './permisos';
import { SesionService } from './sesion.service';

export const conSesion: CanActivateFn = (_r, estado) =>
  inject(SesionService).activa() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { volver: estado.url } });

export const sinSesion: CanActivateFn = () =>
  !inject(SesionService).activa() || inject(Router).createUrlTree(['/inicio']);

export const conPermiso: CanActivateFn = (ruta) =>
  inject(SesionService).puede(ruta.data['accion'] as Accion) ||
  inject(Router).createUrlTree(['/sin-permiso']);
