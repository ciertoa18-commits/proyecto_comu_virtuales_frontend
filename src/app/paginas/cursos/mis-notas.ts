import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { Evaluacion, MiCurso, NOTA_APROBATORIA } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { DialogoService } from '../../shared/dialogo';

@Component({
  selector: 'cv-mis-notas',
  imports: [DecimalPipe, RouterLink],
  template: `
    <h1>Mis notas</h1>
    <p class="subtitulo-pagina">Escala vigesimal (0 a 20). Apruebas con {{ aprobatoria }}.</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    @for (c of cursos(); track c.matricula.idMatricula) {
      <section class="bloque">
        <div class="cabecera">
          <div><h2>{{ c.curso }} <small class="apagado">· Grupo {{ c.grupo }}</small></h2>
            <span class="pill" [class.riesgo]="c.matricula.estado === 'DESAPROBADO'" [class.inactivo]="c.matricula.estado === 'RETIRADO'">{{ c.matricula.estado }}</span></div>
          <div class="promedio" [class.mal]="c.promedio < aprobatoria">
            <small>Promedio</small><b>{{ (c.matricula.notaFinal ?? c.promedio) | number: '1.1-2' }}</b>
          </div>
        </div>
        <div class="tabla-scroll">
          <table class="tabla">
            <thead><tr><th>Evaluación</th><th>Tipo</th><th class="numero">Peso</th><th class="numero">Nota</th><th>Comentario</th></tr></thead>
            <tbody>
              @for (e of c.evaluaciones; track e.idEvaluacion) {
                <tr>
                  <td>{{ e.nombre }}</td><td>{{ e.tipo }}</td><td class="numero">{{ e.peso }}%</td>
                  <td class="numero">@if (notaDe(c, e); as n) { <strong [class.mal]="n.calificacion < aprobatoria">{{ n.calificacion }}</strong> } @else { <span class="apagado">—</span> }</td>
                  <td>{{ notaDe(c, e)?.comentarioDocente ?? '' }}</td>
                </tr>
              } @empty { <tr><td colspan="5" class="vacio">El docente aún no registra evaluaciones.</td></tr> }
            </tbody>
          </table>
        </div>
        <div class="botones">
          <a class="btn btn-chico" [routerLink]="['/secciones', c.matricula.idSeccion]">Ir al curso</a>
          @if (c.matricula.estado === 'MATRICULADO') { <button class="btn btn-chico btn-peligro" type="button" (click)="retirarme(c)">Retirarme del curso</button> }
        </div>
      </section>
    } @empty {
      <p class="vacio">{{ cargando() ? 'Cargando...' : 'Todavía no estás matriculado en ningún curso.' }}</p>
    }
  `,
  styles: `
    .promedio { text-align: center; background: #e5f5e9; color: var(--verde); border-radius: 12px; padding: .5rem 1rem; }
    .promedio small { display: block; font-size: .7rem; }
    .promedio b { font-size: 1.6rem; }
    .promedio.mal, .mal { color: #c0392b; }
    .promedio.mal { background: var(--coral-claro); }
  `,
})
export class MisNotas implements OnInit {
  private readonly dialogo = inject(DialogoService);
  private readonly api = inject(AcademicoApi);
  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly cursos = signal<MiCurso[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.misNotas().subscribe({
      next: (c) => {
        this.cursos.set(c);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected notaDe(c: MiCurso, e: Evaluacion) {
    return c.notas.find((n) => n.idEvaluacion === e.idEvaluacion) ?? null;
  }

  protected async retirarme(c: MiCurso): Promise<void> {
    if (!(await this.dialogo.confirmar(`¿Seguro que quieres retirarte de ${c.curso}?`, { titulo: 'Retirarme del curso', aceptar: 'Retirarme', peligro: true }))) return;
    this.api.retirar(c.matricula.idMatricula).subscribe({
      next: () => {
        this.exito.set('Te retiraste del curso.');
        this.cargar();
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
