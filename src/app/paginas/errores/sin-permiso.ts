import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cv-sin-permiso',
  imports: [RouterLink],
  template: `
    <div class="bloque centrado">
      <div class="grande">🚫</div>
      <h1>No tienes permiso</h1>
      <p class="apagado">Tu rol no puede entrar a esta pantalla.</p>
      <a class="btn btn-primario" routerLink="/inicio">Volver al inicio</a>
    </div>
  `,
  styles: `.centrado { text-align: center; padding: 3rem 1rem; } .grande { font-size: 4rem; }`,
})
export class SinPermiso {}
