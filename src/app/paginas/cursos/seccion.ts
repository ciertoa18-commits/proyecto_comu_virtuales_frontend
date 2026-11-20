import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { Seccion } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { TabAsistencia } from './tab-asistencia';
import { TabContenido } from './tab-contenido';
import { TabEvaluaciones } from './tab-evaluaciones';
import { TabLibreta } from './tab-libreta';
import { TabSeguimiento } from './tab-seguimiento';
import { TabSilabo } from './tab-silabo';
import { Icono } from '../../shared/icono';

type Pestana = 'contenido' | 'silabo' | 'evaluaciones' | 'libreta' | 'asistencia' | 'seguimiento';

@Component({
  selector: 'cv-seccion',
  imports: [Icono, RouterLink, TabContenido, TabEvaluaciones, TabLibreta, TabAsistencia, TabSeguimiento, TabSilabo],
  template: `
    @if (esAdmin) {
      <a class="volver" [routerLink]="idComunidad() ? ['/comunidades', idComunidad()] : ['/comunidades']"><cv-icono nombre="atras" [tamano]="16" /> Volver a la comunidad</a>
    } @else {
      <a class="volver" routerLink="/mis-cursos"><cv-icono nombre="atras" [tamano]="16" /> {{ esDocenteRol ? 'Mis clases' : 'Mis cursos' }}</a>
    }
    @if (seccion(); as s) {
      <section class="cabeza-seccion">
        <div>
          <h1>{{ curso() || 'Sección' }} <span class="grupo">Grupo {{ s.grupo }}</span></h1>
          <p class="apagado">Docente: <strong>{{ personas.nombre(s.idDocente) }}</strong> · <span class="pill" [class.inactivo]="s.estado === 'CERRADA'">{{ s.estado }}</span></p>
        </div>
        @if (s.salaVirtual) { <a class="btn btn-coral" [href]="s.salaVirtual" target="_blank" rel="noopener"><cv-icono nombre="video" [tamano]="16" /> Sala virtual</a> }
      </section>

      @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }

      <nav class="tabs">
        <button class="tab" [class.activa]="pestana() === 'contenido'" (click)="pestana.set('contenido')"><cv-icono nombre="biblioteca" [tamano]="16" /> Contenido</button>
        <button class="tab" [class.activa]="pestana() === 'silabo'" (click)="pestana.set('silabo')"><cv-icono nombre="portapapeles" [tamano]="16" /> Sílabo</button>
        @if (esDocente()) {
          <button class="tab" [class.activa]="pestana() === 'evaluaciones'" (click)="pestana.set('evaluaciones')"><cv-icono nombre="calculadora" [tamano]="16" /> Evaluaciones</button>
          <button class="tab" [class.activa]="pestana() === 'libreta'" (click)="pestana.set('libreta')"><cv-icono nombre="archivo" [tamano]="16" /> Notas</button>
          <button class="tab" [class.activa]="pestana() === 'asistencia'" (click)="pestana.set('asistencia')"><cv-icono nombre="check" [tamano]="16" /> Asistencia</button>
          <button class="tab" [class.activa]="pestana() === 'seguimiento'" (click)="pestana.set('seguimiento')"><cv-icono nombre="tendencia" [tamano]="16" /> Seguimiento</button>
        }
      </nav>
      @switch (pestana()) {
        @case ('contenido') { <cv-tab-contenido [seccion]="s" [docente]="esDocente()" /> }
        @case ('silabo') { <cv-tab-silabo [seccion]="s" [docente]="esDocente()" /> }
        @case ('evaluaciones') { <cv-tab-evaluaciones [seccion]="s" /> }
        @case ('libreta') { <cv-tab-libreta [seccion]="s" (cerrada)="recargar()" /> }
        @case ('asistencia') { <cv-tab-asistencia [seccion]="s" /> }
        @case ('seguimiento') { <cv-tab-seguimiento [seccion]="s" /> }
      }
    } @else if (error()) {
      <div class="alerta" role="alert">{{ error() }}</div>
    } @else {
      <p class="vacio">Cargando sección...</p>
    }
  `,
  styles: `
    .cabeza-seccion { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: #fff; border-radius: 14px; padding: 20px 24px; margin-bottom: 1.2rem; box-shadow: 0 2px 10px rgba(0,0,0,.05); border-left: 6px solid var(--coral); }
    .cabeza-seccion h1 { margin: 0 0 .3rem; font-size: 1.6rem; }
    .grupo { font-size: .9rem; background: var(--azul-claro); color: var(--primario); border-radius: 8px; padding: .2rem .6rem; vertical-align: middle; }
    .cabeza-seccion p { margin: 0; }
    .tab, .btn, .volver { display: inline-flex; align-items: center; gap: .3rem; }
  `,
})
export class PaginaSeccion implements OnInit {
  private readonly api = inject(AcademicoApi);
  private readonly sesion = inject(SesionService);
  protected readonly personas = inject(PersonasService);
  readonly id = input.required<string>();
  readonly tab = input<string>();

  protected readonly seccion = signal<Seccion | null>(null);
  protected readonly curso = signal('');
  protected readonly idComunidad = signal<number | null>(null);
  protected readonly esAdmin = this.sesion.rol() === 'ADMIN';
  protected readonly esDocenteRol = this.sesion.rol() === 'DOCENTE';
  protected readonly pestana = signal<Pestana>('contenido');
  protected readonly error = signal<string | null>(null);
  protected readonly esDocente = computed(() => {
    const s = this.seccion();
    return this.sesion.rol() === 'ADMIN' || (!!s && s.idDocente === this.sesion.sesion()?.idUsuario);
  });

  ngOnInit(): void {
    const t = this.tab();
    if (t === 'silabo' || t === 'contenido') this.pestana.set(t);
    this.recargar();
    this.api.misSecciones().subscribe({
      next: (l) => this.curso.set(l.find((x) => x.idSeccion === +this.id())?.curso ?? ''),
      error: () => undefined,
    });
  }

  protected recargar(): void {
    this.api.seccion(+this.id()).subscribe({
      next: (s) => {
        this.seccion.set(s);
        if (this.esAdmin) this.api.curso(s.idCurso).subscribe({ next: (c) => { this.curso.set(c.nombre); this.idComunidad.set(c.idComunidad); }, error: () => undefined });
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
