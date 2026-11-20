import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../shared/icono';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { ComunicacionApi } from '../core/api/comunicacion.api';
import { NOMBRE_ROL } from '../core/modelos';
import { SesionService } from '../core/sesion/sesion.service';
import { iniciales } from '../core/util/texto';
import { MENU } from './menu';

@Component({
  selector: 'cv-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  templateUrl: './portal.html',
  styleUrl: './portal.css',
})
export class Portal implements OnInit {
  protected readonly sesion = inject(SesionService);
  protected readonly comunicacion = inject(ComunicacionApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly menuAbierto = signal(window.innerWidth > 760);
  protected readonly iniciales = computed(() => iniciales(this.sesion.sesion()?.nombre));
  protected readonly rolTexto = computed(() => {
    const r = this.sesion.rol();
    return r ? NOMBRE_ROL[r] : '';
  });

  protected readonly menu = computed(() => {
    const rol = this.sesion.rol();
    return MENU.map((g) => ({
      grupo: g.grupo,
      opciones: g.opciones.filter(
        (o) => (!o.accion || this.sesion.puede(o.accion)) && (!o.roles || (rol && o.roles.includes(rol))),
      ),
    })).filter((g) => g.opciones.length > 0);
  });

  ngOnInit(): void {
    timer(0, 60_000)
      .pipe(
        switchMap(() => this.comunicacion.notificaciones(0, 50).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected alternar(): void {
    this.menuAbierto.update((v) => !v);
  }

  protected alElegir(): void {
    if (window.innerWidth <= 760) this.menuAbierto.set(false);
  }
}
