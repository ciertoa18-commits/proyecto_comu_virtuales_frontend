import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cv-no-encontrado',
  imports: [RouterLink],
  template: `
    <main class="auth-fondo">
      <div class="auth-card centrado">
        <div class="auth-ilustracion">🧭</div>
        <h1 class="auth-titulo">Página no encontrada</h1>
        <p class="auth-sub">La dirección que buscas no existe.</p>
        <a class="btn-login enlace" routerLink="/inicio">Ir al inicio</a>
      </div>
    </main>
  `,
  styles: `.centrado { text-align: center; }`,
})
export class NoEncontrado {}
