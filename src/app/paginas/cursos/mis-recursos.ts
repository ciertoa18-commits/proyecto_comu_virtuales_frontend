import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AcademicoApi } from '../../core/api/academico.api';
import { Recurso, TIPOS_RECURSO, TipoRecurso } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { BotonDescarga } from '../../shared/boton-descarga';
import { ICONO_RECURSO } from './tab-contenido';

@Component({
  selector: 'cv-mis-recursos',
  imports: [DatePipe, BotonDescarga],
  template: `
    <h1>Mis recursos</h1>
    <p class="subtitulo-pagina">Documentos, videos, enlaces y tareas de todos tus cursos.</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="filtros">
      <label>Buscar <input class="buscador" type="search" placeholder="Título..." (input)="texto.set($any($event.target).value)" /></label>
      <label>Tipo
        <select (change)="tipo.set($any($event.target).value)">
          <option value="">Todos</option>
          @for (t of tipos; track t) { <option [value]="t">{{ icono[t] }} {{ t }}</option> }
        </select>
      </label>
    </div>
    <div class="bloque">
      @for (r of filtrados(); track r.idRecurso) {
        <div class="fila">
          <div class="r"><span class="ico">{{ icono[r.tipo] }}</span>
            <div><strong>{{ r.titulo }}</strong><div class="apagado">{{ r.tipo }} · {{ r.fechaPublicacion | date: 'dd/MM/yyyy' }}</div>
              @if (r.descripcion) { <div class="desc">{{ r.descripcion }}</div> }</div></div>
          <div class="acciones">
            @if (r.idArchivo) { <cv-descarga [idArchivo]="r.idArchivo" /> }
            @if (r.urlExterna) { <a class="btn btn-chico btn-azul-borde" [href]="r.urlExterna" target="_blank" rel="noopener">Abrir ↗</a> }
          </div>
        </div>
      } @empty {
        <p class="vacio">{{ cargando() ? 'Cargando...' : 'No hay recursos.' }}</p>
      }
    </div>
    <p class="apagado">Para entregar una tarea, entra al curso desde <strong>Mis cursos</strong>.</p>
  `,
  styles: `.r { display: flex; gap: 12px; } .ico { font-size: 1.5rem; } .desc { color: #444; font-size: .88rem; }`,
})
export class MisRecursos implements OnInit {
  private readonly api = inject(AcademicoApi);
  protected readonly icono = ICONO_RECURSO;
  protected readonly tipos = TIPOS_RECURSO;
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly texto = signal('');
  protected readonly tipo = signal<TipoRecurso | ''>('');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtrados = computed(() => {
    const t = this.texto().trim().toLowerCase();
    return this.recursos().filter((r) => (!this.tipo() || r.tipo === this.tipo()) && (!t || r.titulo.toLowerCase().includes(t)));
  });

  ngOnInit(): void {
    this.api.misRecursos().subscribe({
      next: (r) => {
        this.recursos.set([...r].sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion)));
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
