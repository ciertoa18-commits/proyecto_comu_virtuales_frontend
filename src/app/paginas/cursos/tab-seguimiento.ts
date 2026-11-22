import { DecimalPipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { AcademicoApi } from '../../core/api/academico.api';
import { FilaRanking, FilaRiesgo, NOTA_APROBATORIA, Seccion } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';

@Component({
  selector: 'cv-tab-seguimiento',
  imports: [Icono, DecimalPipe],
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="dos">
      <section>
        <h2><cv-icono nombre="trofeo" [tamano]="20" /> Ranking</h2>
        <div class="bloque">
          @for (r of ranking(); track r.idUsuario; let i = $index) {
            <div class="fila">
              <span><span class="puesto" [class.oro]="i === 0" [class.plata]="i === 1" [class.bronce]="i === 2">{{ i + 1 }}</span> {{ r.estudiante.nombres }} {{ r.estudiante.apellidos }}</span>
              <strong [class.mal]="r.promedio < aprobatoria">{{ r.promedio | number: '1.1-2' }}</strong>
            </div>
          } @empty { <p class="vacio">{{ cargando() ? 'Cargando...' : 'Sin notas todavía.' }}</p> }
        </div>
      </section>
      <section>
        <h2><cv-icono nombre="alerta" [tamano]="20" /> En riesgo</h2>
        <p class="apagado">Estudiantes con promedio menor a {{ aprobatoria }}.</p>
        <div class="bloque">
          @for (r of riesgo(); track r.matricula.idMatricula) {
            <div class="fila"><span>{{ r.estudiante.nombres }} {{ r.estudiante.apellidos }}</span><span class="pill riesgo">{{ r.promedio | number: '1.1-2' }}</span></div>
          } @empty { <p class="vacio">{{ cargando() ? 'Cargando...' : 'Nadie está en riesgo.' }}</p> }
        </div>
      </section>
    </div>
  `,
  styles: `
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
    .puesto { display: inline-flex; width: 26px; height: 26px; border-radius: 50%; background: var(--superficie-2); align-items: center; justify-content: center; font-size: .78rem; font-weight: 800; margin-right: .4rem; }
    .oro { background: #f5c542; } .plata { background: var(--borde-input); } .bronce { background: #e0a46b; }
    .mal { color: #c0392b; }
    @media (max-width: 800px) { .dos { grid-template-columns: 1fr; } }
  `,
})
export class TabSeguimiento implements OnInit {
  private readonly api = inject(AcademicoApi);
  readonly seccion = input.required<Seccion>();
  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly ranking = signal<FilaRanking[]>([]);
  protected readonly riesgo = signal<FilaRiesgo[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    const id = this.seccion().idSeccion;
    this.api.ranking(id).subscribe({
      next: (r) => {
        this.ranking.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
    this.api.riesgo(id).subscribe({ next: (r) => this.riesgo.set(r), error: () => undefined });
  }
}
