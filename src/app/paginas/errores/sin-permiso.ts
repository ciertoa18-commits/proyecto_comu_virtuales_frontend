import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../../shared/icono';

@Component({
  selector: 'cv-sin-permiso',
  imports: [RouterLink, Icono],
  template: `
    <div class="bloque centrado">
      <div class="grande"><cv-icono nombre="prohibido" [tamano]="64" /></div>
      <h1>No tienes permiso</h1>
      <p class="apagado">Tu rol no puede entrar a esta pantalla.</p>
      <a class="btn btn-primario" routerLink="/inicio">Volver al inicio</a>
    </div>
  `,
  styles: `.centrado { text-align: center; padding: 3rem 1rem; } .grande { color: var(--coral); }`,
})
export class SinPermiso {}
