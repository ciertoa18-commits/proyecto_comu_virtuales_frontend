import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { NOTA_APROBATORIA, ResumenCurso } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { portada } from '../../core/util/texto';
import { Icono } from '../../shared/icono';

@Component({
  selector: 'cv-mis-cursos',
  imports: [DecimalPipe, RouterLink, Icono],
  template: `
    <h1>{{ titulo }}</h1>
    <p class="subtitulo-pagina">{{ subtitulo }}</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }

    @if (esAlumno && cursos().length) {
      <div class="kpis">
        <div class="bloque kpi"><cv-icono nombre="libro" [tamano]="24" /><b>{{ cursos().length }}</b><small>Cursos</small></div>
        <div class="bloque kpi"><cv-icono nombre="calculadora" [tamano]="24" /><b>{{ promedioGeneral() === null ? '—' : (promedioGeneral()! | number: '1.1-1') }}</b><small>Promedio general</small></div>
        <div class="bloque kpi"><cv-icono nombre="check" [tamano]="24" /><b>{{ asistenciaGeneral() }}%</b><small>Asistencia</small></div>
        <div class="bloque kpi"><cv-icono nombre="portapapeles" [tamano]="24" /><b>{{ conSilabo() }}</b><small>Sílabos publicados</small></div>
      </div>
    }

    <div class="lista">
      @for (c of cursos(); track c.idSeccion) {
        <article class="curso">
          <div class="banda" [style.background-image]="'url(' + portada(c.idSeccion) + ')'"></div>
          <div class="cuerpo">
            <div class="cab">
              <div>
                <a class="nombre" [routerLink]="['/secciones', c.idSeccion]">{{ c.curso }}</a>
                <div class="apagado">{{ c.codigo }} · Grupo {{ c.grupo }} · {{ esAlumno ? 'Docente: ' + c.docente : c.alumnos + ' estudiante(s)' }}</div>
              </div>
              <span class="pill" [class.inactivo]="c.estadoSeccion === 'CERRADA'">{{ estado(c) }}</span>
            </div>

            @if (esAlumno) {
              <div class="metricas">
                <div class="metrica">
                  <small>Mi promedio</small>
                  <b [class.mal]="c.promedio !== null && c.notas > 0 && c.promedio < notaMinima" [class.bien]="c.promedio !== null && c.notas > 0 && c.promedio >= notaMinima">
                    {{ c.notas > 0 && c.promedio !== null ? (c.promedio | number: '1.1-1') : '—' }}</b>
                  <span class="apagado">{{ c.notas }} de {{ c.evaluaciones }} notas</span>
                </div>
                <div class="metrica">
                  <small>Asistencia</small>
                  <b [class.mal]="(c.asistencia?.porcentaje ?? 100) < 70">{{ c.asistencia?.porcentaje ?? 100 }}%</b>
                  <div class="barra"><span [style.width.%]="c.asistencia?.porcentaje ?? 100"></span></div>
                  @if (c.asistencia; as a) { <span class="apagado">{{ a.faltas }} falta(s) · {{ a.tardanzas }} tardanza(s)</span> }
                </div>
                <div class="metrica">
                  <small>Recursos</small>
                  <b>{{ c.recursos }}</b>
                  <span class="apagado">documentos, videos y tareas</span>
                </div>
              </div>
            } @else {
              <div class="metricas">
                <div class="metrica"><small>Evaluaciones</small><b>{{ c.evaluaciones }}</b></div>
                <div class="metrica"><small>Recursos</small><b>{{ c.recursos }}</b></div>
                <div class="metrica"><small>Sílabo</small><b>{{ c.tieneSilabo ? 'Publicado' : 'Pendiente' }}</b></div>
              </div>
            }

            <div class="accesos">
              <a class="btn btn-chico btn-primario" [routerLink]="['/secciones', c.idSeccion]"><cv-icono nombre="adelante" [tamano]="14" /> Entrar al curso</a>
              <a class="btn btn-chico" [routerLink]="['/secciones', c.idSeccion]" [queryParams]="{ tab: 'silabo' }"><cv-icono nombre="portapapeles" [tamano]="14" /> {{ c.tieneSilabo ? 'Ver sílabo' : esAlumno ? 'Sílabo (pendiente)' : 'Crear sílabo' }}</a>
              @if (esAlumno) {
                <a class="btn btn-chico" routerLink="/mis-recursos" [queryParams]="{ seccion: c.idSeccion }"><cv-icono nombre="biblioteca" [tamano]="14" /> Recursos</a>
                <a class="btn btn-chico" routerLink="/mis-notas"><cv-icono nombre="archivo" [tamano]="14" /> Mis notas</a>
              }
            </div>
          </div>
        </article>
      } @empty {
        <div class="bloque vacio">
          <p>{{ cargando() ? 'Cargando...' : 'Todavía no tienes cursos.' }}</p>
          @if (!cargando()) { <a class="btn btn-primario" routerLink="/comunidades">Explorar comunidades</a> }
        </div>
      }
    </div>
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .8rem; margin-bottom: 1.2rem; }
    .kpi { display: flex; flex-direction: column; gap: .15rem; border-left: 5px solid var(--coral); color: var(--acento-texto); }
    .kpi b { font-size: 1.6rem; color: var(--ink); } .kpi small { color: var(--muted); }
    .lista { display: flex; flex-direction: column; gap: 1rem; }
    .curso { display: flex; background: var(--superficie); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, .06); }
    .banda { width: 120px; flex: none; background-size: cover; background-position: center; }
    .cuerpo { flex: 1; padding: 16px 20px; min-width: 0; }
    .cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .nombre { font-size: 1.15rem; font-weight: 800; color: var(--ink); text-decoration: none; }
    .nombre:hover { color: var(--acento-texto-osc); }
    .metricas { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .8rem; margin: .9rem 0; }
    .metrica { background: var(--superficie-2); border-radius: 10px; padding: .6rem .8rem; display: flex; flex-direction: column; gap: .1rem; }
    .metrica small { color: var(--muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
    .metrica b { font-size: 1.35rem; }
    .metrica .apagado { font-size: .75rem; }
    .bien { color: #2e7d32; } .mal { color: #c0392b; }
    .barra { height: 6px; background: var(--superficie-2); border-radius: 999px; overflow: hidden; }
    .barra span { display: block; height: 100%; background: var(--coral); }
    .accesos { display: flex; gap: .4rem; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: .3rem; }
    @media (max-width: 640px) { .banda { display: none; } }
  `,
})
export class MisCursos implements OnInit {
  private readonly api = inject(AcademicoApi);
  private readonly rol = inject(SesionService).rol();
  protected readonly portada = portada;
  protected readonly notaMinima = NOTA_APROBATORIA;
  protected readonly esAlumno = this.rol === 'ESTUDIANTE';
  protected readonly cursos = signal<ResumenCurso[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly titulo = this.rol === 'DOCENTE' ? 'Mis clases' : 'Mis cursos';
  protected readonly subtitulo =
    this.rol === 'DOCENTE'
      ? 'Secciones que dictas.'
      : 'Notas, asistencia, sílabo y recursos de cada curso.';

  protected readonly promedioGeneral = computed(() => {
    const con = this.cursos().filter((c) => c.notas > 0 && c.promedio !== null);
    return con.length ? con.reduce((s, c) => s + (c.promedio ?? 0), 0) / con.length : null;
  });
  protected readonly asistenciaGeneral = computed(() => {
    let total = 0;
    let asistio = 0;
    for (const c of this.cursos()) {
      const a = c.asistencia;
      if (!a) continue;
      total += a.total;
      asistio += a.puntuales + a.tardanzas + a.justificadas;
    }
    return total ? Math.round((asistio * 100) / total) : 100;
  });
  protected readonly conSilabo = computed(() => this.cursos().filter((c) => c.tieneSilabo).length);

  ngOnInit(): void {
    this.api.misCursosResumen().subscribe({
      next: (s) => {
        this.cursos.set(s);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected estado(c: ResumenCurso): string {
    if (c.estadoMatricula === 'APROBADO') return 'Aprobado';
    if (c.estadoMatricula === 'DESAPROBADO') return 'Desaprobado';
    return c.estadoSeccion === 'CERRADA' ? 'Cerrado' : c.estadoSeccion === 'EN_CURSO' ? 'En curso' : 'Abierto';
  }
}
