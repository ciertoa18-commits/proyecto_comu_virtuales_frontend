import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../../shared/icono';

@Component({
  selector: 'cv-no-encontrado',
  imports: [RouterLink, Icono],
  template: `
    <main class="auth-fondo">
      <div class="auth-card centrado">
        <div class="auth-ilustracion"><cv-icono nombre="brujula" [tamano]="56" /></div>
        <h1 class="auth-titulo">Página no encontrada</h1>
        <p class="auth-sub">La dirección que buscas no existe.</p>
        <a class="btn-login enlace" routerLink="/inicio">Ir al inicio</a>
      </div>
    </main>
  `,
  styles: `.centrado { text-align: center; }`,
})
export class NoEncontrado {}
