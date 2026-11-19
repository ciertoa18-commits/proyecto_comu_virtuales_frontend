import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { ESTADOS_ASISTENCIA, EstadoAsistencia, FilaLibreta, Seccion, Sesion } from '../../core/modelos';
import { textoError } from '../../core/util/errores';

interface Marca { idMatricula: number; nombre: string; estado: EstadoAsistencia; observacion: string; }

@Component({
  selector: 'cv-tab-asistencia',
  imports: [DatePipe],
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <div class="filtros">
      <label>Sesión
        <select (change)="elegir($any($event.target).value)">
          <option value="">Elige una sesión...</option>
          @for (s of sesiones(); track s.idSesion) {
            <option [value]="s.idSesion">{{ s.titulo }}{{ s.fechaInicio ? ' · ' + (s.fechaInicio | date: 'dd/MM HH:mm') : '' }}</option>
          }
        </select>
      </label>
      @if (marcas().length) {
        <button class="btn btn-chico" type="button" (click)="todos('PRESENTE')">Todos presentes</button>
      }
    </div>

    @if (idSesion()) {
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>Estudiante</th>@for (e of estados; track e) { <th class="centro">{{ e }}</th> }<th>Observación</th></tr></thead>
          <tbody>
            @for (m of marcas(); track m.idMatricula) {
              <tr>
                <td>{{ m.nombre }}</td>
                @for (e of estados; track e) {
                  <td class="centro"><input type="radio" [name]="'a' + m.idMatricula" [checked]="m.estado === e" (change)="m.estado = e" [disabled]="cerrada()" [attr.aria-label]="m.nombre + ' ' + e" /></td>
                }
                <td><input type="text" maxlength="300" [value]="m.observacion" (input)="m.observacion = $any($event.target).value" [disabled]="cerrada()" /></td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="vacio">No hay estudiantes matriculados.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (marcas().length && !cerrada()) {
        <div class="botones"><button class="btn btn-primario" type="button" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando...' : 'Guardar asistencia' }}</button></div>
      }
    } @else {
      <p class="vacio">{{ sesiones().length ? 'Elige una sesión para tomar asistencia.' : 'Primero crea sesiones en la pestaña Contenido.' }}</p>
    }
  `,
  styles: `.centro { text-align: center !important; }`,
})
export class TabAsistencia implements OnInit {
  private readonly api = inject(AcademicoApi);
  readonly seccion = input.required<Seccion>();
  protected readonly estados = ESTADOS_ASISTENCIA;
  protected readonly sesiones = signal<Sesion[]>([]);
  protected readonly alumnos = signal<FilaLibreta[]>([]);
  protected readonly idSesion = signal<number | null>(null);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cerrada = computed(() => this.seccion().estado === 'CERRADA');

  ngOnInit(): void {
    const id = this.seccion().idSeccion;
    this.api.libreta(id).subscribe({ next: (f) => this.alumnos.set(f.filter((x) => x.matricula.estado !== 'RETIRADO')), error: (e) => this.error.set(textoError(e)) });
    this.api.unidades(id).subscribe({
      next: (us) => {
        if (!us.length) return;
        forkJoin(us.map((u) => this.api.sesiones(u.idUnidad))).subscribe({
          next: (listas) => this.sesiones.set(listas.flat().sort((a, b) => (a.fechaInicio ?? '').localeCompare(b.fechaInicio ?? ''))),
        });
      },
    });
  }

  protected elegir(valor: string): void {
    this.exito.set(null);
    const id = valor ? +valor : null;
    this.idSesion.set(id);
    if (!id) return;
    this.api.asistencia(id).subscribe({
      next: (previas) => {
        this.marcas.set(
          this.alumnos().map((f) => {
            const p = previas.find((a) => a.idMatricula === f.matricula.idMatricula);
            return {
              idMatricula: f.matricula.idMatricula,
              nombre: `${f.estudiante.apellidos}, ${f.estudiante.nombres}`,
              estado: p?.estado ?? 'PRESENTE',
              observacion: p?.observacion ?? '',
            };
          }),
        );
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected todos(e: EstadoAsistencia): void {
    this.marcas.update((l) => l.map((m) => ({ ...m, estado: e })));
  }

  protected guardar(): void {
    const id = this.idSesion();
    if (!id) return;
    this.guardando.set(true);
    this.api
      .registrarAsistencia(id, this.marcas().map((m) => ({ idMatricula: m.idMatricula, estado: m.estado, observacion: m.observacion.trim() || null })))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.exito.set('Asistencia guardada ✅');
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(textoError(e));
        },
      });
  }
}
