import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from '../shared/icono';
import { merge, switchMap, timer } from 'rxjs';
import { ComunicacionApi } from '../core/api/comunicacion.api';
import { NOMBRE_ROL } from '../core/modelos';
import { SesionService } from '../core/sesion/sesion.service';
import { iniciales } from '../core/util/texto';
import { MENU } from './menu';
import { AjustesService } from '../core/ajustes/ajustes.service';
import { TiempoRealService } from '../core/util/tiempo-real.service';

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

  private readonly ajustes = inject(AjustesService);
  protected readonly menuAbierto = signal(window.innerWidth > 760 && this.ajustes.preferencias().menuAbiertoAlEntrar);
  protected readonly oscuro = computed(() => {
    const t = this.ajustes.preferencias().tema;
    return t === 'oscuro' || (t === 'sistema' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  });
  protected readonly menuCuenta = signal(false);
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

  private readonly tiempoReal = inject(TiempoRealService);

  ngOnInit(): void {
    merge(timer(0, 120_000), this.tiempoReal.de('NOTIFICACION'))
      .pipe(
        switchMap(() => this.comunicacion.contarSinLeer()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected alternarCuenta(ev: Event): void {
    ev.stopPropagation();
    this.menuCuenta.update((v) => !v);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected cerrarCuenta(): void {
    this.menuCuenta.set(false);
  }

  protected alternarTema(): void {
    this.ajustes.cambiar('tema', this.oscuro() ? 'claro' : 'oscuro');
  }

  protected salir(): void {
    this.menuCuenta.set(false);
    this.sesion.salir();
  }

  protected alternar(): void {
    this.menuAbierto.update((v) => !v);
  }

  protected alElegir(): void {
    if (window.innerWidth <= 760) this.menuAbierto.set(false);
  }
}
