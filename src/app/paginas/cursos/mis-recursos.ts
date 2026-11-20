import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { Recurso, ResumenCurso, TIPOS_RECURSO, TipoRecurso, Unidad } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { portada } from '../../core/util/texto';
import { BotonDescarga } from '../../shared/boton-descarga';
import { Icono } from '../../shared/icono';
import { ICONO_RECURSO } from './tab-contenido';

interface Grupo { unidad: Unidad | null; recursos: Recurso[]; }

@Component({
  selector: 'cv-mis-recursos',
  imports: [DatePipe, RouterLink, BotonDescarga, Icono],
  template: `
    @if (elegido(); as c) {
      <button class="volver enlace" type="button" (click)="volver()"><cv-icono nombre="atras" [tamano]="16" /> Elegir otro curso</button>
      <section class="cabeza">
        <div><h1>{{ c.curso }}</h1><p class="apagado">Grupo {{ c.grupo }} · Docente: {{ c.docente }}</p></div>
        <a class="btn" [routerLink]="['/secciones', c.idSeccion]"><cv-icono nombre="adelante" [tamano]="16" /> Entrar al curso</a>
      </section>
      @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
      <div class="filtros">
        <label>Buscar <input class="buscador" type="search" placeholder="Título..." (input)="texto.set($any($event.target).value)" /></label>
        <label>Tipo
          <select (change)="tipo.set($any($event.target).value)">
            <option value="">Todos</option>
            @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </label>
      </div>
      @for (g of grupos(); track g.unidad?.idUnidad ?? 0) {
        <h2 class="unidad">{{ g.unidad ? 'Unidad ' + g.unidad.orden + ': ' + g.unidad.nombre : 'Otros recursos' }}</h2>
        <div class="bloque">
          @for (r of g.recursos; track r.idRecurso) {
            <div class="fila">
              <div class="r"><span class="ico"><cv-icono [nombre]="icono[r.tipo]" [tamano]="20" /></span>
                <div><strong>{{ r.titulo }}</strong><div class="apagado">{{ r.tipo }} · {{ r.fechaPublicacion | date: 'dd/MM/yyyy' }}</div>
                  @if (r.descripcion) { <div class="desc">{{ r.descripcion }}</div> }</div></div>
              <div class="acciones">
                @if (r.idArchivo) { <cv-descarga [idArchivo]="r.idArchivo" /> }
                @if (r.urlExterna) { <a class="btn btn-chico btn-azul-borde" [href]="r.urlExterna" target="_blank" rel="noopener">Abrir <cv-icono nombre="externo" [tamano]="14" /></a> }
              </div>
            </div>
          }
        </div>
      } @empty {
        <p class="vacio">{{ cargandoRecursos() ? 'Cargando recursos...' : 'Este curso todavía no tiene recursos.' }}</p>
      }
      <p class="apagado">Para entregar una tarea, entra al curso.</p>
    } @else {
      <h1>Mis recursos</h1>
      <p class="subtitulo-pagina">Elige un curso para ver sus documentos, videos, enlaces y tareas.</p>
      @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
      <div class="rejilla">
        @for (c of cursos(); track c.idSeccion) {
          <button class="com-card tarjeta-curso" type="button" (click)="elegir(c)">
            <div class="com-banner" [style.background-image]="'url(' + portada(c.idSeccion) + ')'"></div>
            <div class="com-body">
              <div class="com-titulo"><strong>{{ c.curso }}</strong></div>
              <p class="com-desc">Grupo {{ c.grupo }} · {{ c.docente }}</p>
              <span class="pill"><cv-icono nombre="biblioteca" [tamano]="14" /> {{ c.recursos }} recurso(s)</span>
            </div>
          </button>
        } @empty {
          <p class="vacio">{{ cargando() ? 'Cargando cursos...' : 'No estás matriculado en ningún curso.' }}</p>
        }
      </div>
    }
  `,
  styles: `
    .r { display: flex; gap: 12px; } .ico { color: var(--coral); display: inline-flex; } .desc { color: #444; font-size: .88rem; }
    .btn, .pill, .volver { display: inline-flex; align-items: center; gap: .3rem; }
    .enlace { background: none; border: 0; font: inherit; cursor: pointer; padding: 0; }
    .cabeza { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .cabeza h1 { margin: 0; }
    .unidad { font-size: 1rem; margin: 1.2rem 0 .5rem; color: var(--coral-osc); }
    .tarjeta-curso { text-align: left; font: inherit; border: 0; padding: 0; cursor: pointer; }
  `,
})
export class MisRecursos implements OnInit {
  private readonly api = inject(AcademicoApi);
  private readonly router = inject(Router);
  readonly seccion = input<string>();

  protected readonly icono = ICONO_RECURSO;
  protected readonly tipos = TIPOS_RECURSO;
  protected readonly portada = portada;
  protected readonly cursos = signal<ResumenCurso[]>([]);
  protected readonly elegido = signal<ResumenCurso | null>(null);
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly unidades = signal<Unidad[]>([]);
  protected readonly texto = signal('');
  protected readonly tipo = signal<TipoRecurso | ''>('');
  protected readonly cargando = signal(true);
  protected readonly cargandoRecursos = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly grupos = computed<Grupo[]>(() => {
    const t = this.texto().trim().toLowerCase();
    const lista = this.recursos().filter((r) => (!this.tipo() || r.tipo === this.tipo()) && (!t || r.titulo.toLowerCase().includes(t)));
    const porUnidad = [...this.unidades()]
      .sort((a, b) => a.orden - b.orden)
      .map((u) => ({ unidad: u as Unidad | null, recursos: lista.filter((r) => r.idUnidad === u.idUnidad) }));
    const ids = new Set(this.unidades().map((u) => u.idUnidad));
    const sueltos = lista.filter((r) => !ids.has(r.idUnidad));
    return [...porUnidad, ...(sueltos.length ? [{ unidad: null, recursos: sueltos }] : [])].filter((g) => g.recursos.length);
  });

  ngOnInit(): void {
    this.api.misCursosResumen().subscribe({
      next: (c) => {
        this.cursos.set(c);
        this.cargando.set(false);
        const pedido = c.find((x) => x.idSeccion === Number(this.seccion()));
        if (pedido) this.elegir(pedido);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected elegir(c: ResumenCurso): void {
    this.elegido.set(c);
    this.recursos.set([]);
    this.unidades.set([]);
    this.texto.set('');
    this.tipo.set('');
    this.error.set(null);
    this.cargandoRecursos.set(true);
    void this.router.navigate([], { queryParams: { seccion: c.idSeccion }, replaceUrl: true });
    forkJoin({ recursos: this.api.misRecursos(c.idSeccion), unidades: this.api.unidades(c.idSeccion) }).subscribe({
      next: ({ recursos, unidades }) => {
        this.recursos.set([...recursos].sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion)));
        this.unidades.set(unidades);
        this.cargandoRecursos.set(false);
      },
      error: (e) => {
        this.cargandoRecursos.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected volver(): void {
    this.elegido.set(null);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}
