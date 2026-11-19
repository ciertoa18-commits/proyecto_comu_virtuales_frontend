import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { AdminApi } from '../../core/api/admin.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Clase, Comunidad, SeccionResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { portada } from '../../core/util/texto';

@Component({
  selector: 'cv-inicio',
  imports: [DatePipe, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  protected readonly sesion = inject(SesionService);
  private readonly academico = inject(AcademicoApi);
  private readonly comunidades = inject(ComunidadApi);
  private readonly admin = inject(AdminApi);

  protected readonly portada = portada;
  protected readonly nombre = computed(() => this.sesion.sesion()?.nombre.split(' ')[0] ?? '');
  protected readonly clases = signal<Clase[]>([]);
  protected readonly secciones = signal<SeccionResumen[]>([]);
  protected readonly recomendadas = signal<Comunidad[]>([]);
  protected readonly docentesPendientes = signal(0);
  protected readonly solicitudesPendientes = signal(0);
  protected readonly totalUsuarios = signal(0);
  protected readonly totalComunidades = signal(0);

  ngOnInit(): void {
    const rol = this.sesion.rol();
    if (rol === 'ESTUDIANTE') {
      this.academico.misClases().subscribe({
        next: (c) => this.clases.set(c.filter((x) => !x.sesion.fechaInicio || new Date(x.sesion.fechaInicio) >= this.hoy()).slice(0, 6)),
        error: () => undefined,
      });
    }
    if (rol !== 'ADMIN') {
      this.academico.misSecciones().subscribe({ next: (s) => this.secciones.set(s.slice(0, 6)), error: () => undefined });
    }
    this.comunidades.recomendadas().subscribe({ next: (p) => this.recomendadas.set(p.content.slice(0, 4)), error: () => undefined });
    if (rol === 'ADMIN') {
      this.admin.usuarios({ estado: 'PENDIENTE', size: 1 }).subscribe({
        next: (p) => this.docentesPendientes.set(p.page.totalElements),
        error: () => undefined,
      });
      this.admin.usuarios({ size: 1 }).subscribe({ next: (p) => this.totalUsuarios.set(p.page.totalElements), error: () => undefined });
      this.comunidades.solicitudes('PENDIENTE').subscribe({ next: (p) => this.solicitudesPendientes.set(p.page.totalElements), error: () => undefined });
      this.comunidades.listar({ size: 1 }).subscribe({ next: (p) => this.totalComunidades.set(p.page.totalElements), error: () => undefined });
    }
  }

  private hoy(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
