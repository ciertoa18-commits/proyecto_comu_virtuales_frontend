import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin.api';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { Periodo, ReporteDocente, ReporteIdioma } from '../../core/modelos';
import { textoError } from '../../core/util/errores';

@Component({
  selector: 'cv-reportes',
  template: `
    <h1>Reportes</h1>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="tarjetas">
      <div class="bloque kpi"><span>🌎</span><b>{{ totalComunidades() }}</b><small>Comunidades activas</small></div>
      <div class="bloque kpi"><span>📚</span><b>{{ totalRecursos() }}</b><small>Recursos publicados</small></div>
      <div class="bloque kpi"><span>🧑‍🏫</span><b>{{ docentes().length }}</b><small>Docentes activos</small></div>
      <div class="bloque kpi"><span>🎒</span><b>{{ totalMatriculas() }}</b><small>Matrículas</small></div>
    </div>

    <section class="bloque">
      <h2>Comunidades y recursos por idioma</h2>
      @for (i of idiomas(); track i.ID_IDIOMA) {
        <div class="barra-fila">
          <span class="etq">{{ i.NOMBRE }}</span>
          <div class="barras">
            <div class="barra c" [style.width.%]="pct(i.COMUNIDADES, maxIdioma())">{{ i.COMUNIDADES }}</div>
            <div class="barra r" [style.width.%]="pct(i.RECURSOS, maxIdioma())">{{ i.RECURSOS }}</div>
          </div>
        </div>
      } @empty { <p class="vacio">Sin datos.</p> }
      <p class="leyenda"><span class="m c"></span> Comunidades <span class="m r"></span> Recursos</p>
    </section>

    <section class="bloque">
      <div class="cabecera">
        <h2>Carga de los docentes</h2>
        <label class="apagado">Periodo
          <select (change)="cargarDocentes($any($event.target).value)">
            <option value="">Todos</option>
            @for (p of periodos(); track p.idPeriodo) { <option [value]="p.idPeriodo">{{ p.nombre }}</option> }
          </select>
        </label>
      </div>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>Docente</th><th class="numero">Secciones</th><th class="numero">Estudiantes</th></tr></thead>
          <tbody>
            @for (d of docentes(); track d.ID_USUARIO) {
              <tr><td>{{ d.APELLIDOS }}, {{ d.NOMBRES }}</td><td class="numero">{{ d.SECCIONES }}</td><td class="numero">{{ d.MATRICULAS }}</td></tr>
            } @empty { <tr><td colspan="3" class="vacio">Sin docentes.</td></tr> }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .kpi { display: flex; flex-direction: column; align-items: flex-start; gap: .2rem; border-left: 5px solid var(--coral); }
    .kpi span { font-size: 1.5rem; } .kpi b { font-size: 1.8rem; } .kpi small { color: #666; }
    .barra-fila { display: grid; grid-template-columns: 110px 1fr; gap: .8rem; align-items: center; margin: .6rem 0; }
    .etq { font-weight: 600; font-size: .9rem; }
    .barras { display: flex; flex-direction: column; gap: 3px; }
    .barra { min-width: 26px; height: 18px; border-radius: 4px; color: #fff; font-size: .7rem; font-weight: 700; padding: 0 6px; display: flex; align-items: center; }
    .c { background: var(--primario); } .r { background: var(--coral); }
    .leyenda { font-size: .8rem; color: #666; display: flex; gap: .4rem; align-items: center; }
    .m { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-left: .6rem; }
  `,
})
export class Reportes implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly catalogo = inject(CatalogoApi);
  protected readonly idiomas = signal<ReporteIdioma[]>([]);
  protected readonly docentes = signal<ReporteDocente[]>([]);
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly totalComunidades = computed(() => this.idiomas().reduce((s, i) => s + i.COMUNIDADES, 0));
  protected readonly totalRecursos = computed(() => this.idiomas().reduce((s, i) => s + i.RECURSOS, 0));
  protected readonly totalMatriculas = computed(() => this.docentes().reduce((s, d) => s + d.MATRICULAS, 0));
  protected readonly maxIdioma = computed(() => Math.max(1, ...this.idiomas().flatMap((i) => [i.COMUNIDADES, i.RECURSOS])));

  ngOnInit(): void {
    this.api.reporteIdiomas().subscribe({ next: (r) => this.idiomas.set(r), error: (e) => this.error.set(textoError(e)) });
    this.catalogo.periodos().subscribe({ next: (p) => this.periodos.set(p), error: () => undefined });
    this.cargarDocentes('');
  }

  protected cargarDocentes(periodo: string): void {
    this.api.reporteDocentes(periodo ? +periodo : null).subscribe({ next: (r) => this.docentes.set(r), error: (e) => this.error.set(textoError(e)) });
  }

  protected pct(v: number, max: number): number {
    return Math.max(4, (v / max) * 100);
  }
}
