import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { ESTADOS_ASISTENCIA, EstadoAsistencia, FilaLibreta, Seccion, Sesion } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';

interface Marca { idMatricula: number; nombre: string; estado: EstadoAsistencia; observacion: string; }

export const NOMBRE_ASISTENCIA: Record<EstadoAsistencia, string> = { PRESENTE: 'Puntual', TARDANZA: 'Tardanza', FALTA: 'Falta', JUSTIFICADA: 'Justificado' };

@Component({
  selector: 'cv-tab-asistencia',
  imports: [DatePipe, Icono],
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
      @if (marcas().length && editando()) {
        <button class="btn btn-chico" type="button" (click)="todos('PRESENTE')"><cv-icono nombre="check" [tamano]="14" /> Todos puntuales</button>
      }
    </div>

    @if (idSesion()) {
      @if (marcas().length) {
        <div class="resumen">
          @for (e of estados; track e) { <span class="etq" [attr.data-estado]="e">{{ nombre[e] }}: <b>{{ conteo()[e] }}</b></span> }
        </div>
      }
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>Estudiante</th>@for (e of estados; track e) { <th class="centro">{{ nombre[e] }}</th> }<th>Razón u observación</th></tr></thead>
          <tbody>
            @for (m of marcas(); track m.idMatricula; let i = $index) {
              <tr>
                <td>{{ m.nombre }}</td>
                @for (e of estados; track e) {
                  <td class="centro"><input type="radio" [name]="'a' + m.idMatricula" [checked]="m.estado === e" (change)="marcar(i, e)" [disabled]="!editando()" [attr.aria-label]="m.nombre + ' ' + nombre[e]" /></td>
                }
                <td>
                  <input type="text" maxlength="300" [value]="m.observacion" (input)="observar(i, $any($event.target).value)" [disabled]="!editando()"
                    [class.invalido]="faltaRazon(m)" [placeholder]="m.estado === 'JUSTIFICADA' ? 'Razón de la justificación (obligatoria)' : 'Opcional'" />
                  @if (faltaRazon(m)) { <small class="campo-error">Escribe la razón.</small> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="vacio">No hay estudiantes matriculados.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (marcas().length && !cerrada()) {
        <div class="botones">
          @if (editando()) {
            @if (registrada()) { <button class="btn" type="button" (click)="cancelar()">Cancelar</button> }
            <button class="btn btn-primario" type="button" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando...' : 'Guardar asistencia' }}</button>
          } @else {
            <button class="btn btn-primario" type="button" (click)="modificar()"><cv-icono nombre="lapiz" [tamano]="16" /> Modificar asistencia</button>
          }
        </div>
      }
    } @else {
      <p class="vacio">{{ sesiones().length ? 'Elige una sesión para tomar asistencia.' : 'Primero crea sesiones en la pestaña Contenido.' }}</p>
    }
  `,
  styles: `
    .centro { text-align: center !important; }
    .btn { display: inline-flex; align-items: center; gap: .3rem; }
    .resumen { display: flex; gap: .5rem; flex-wrap: wrap; margin: .2rem 0 .8rem; }
    .etq { border-radius: 999px; padding: .2rem .7rem; font-size: .8rem; background: var(--tinte-verde); color: var(--txt-verde); }
    .etq[data-estado='TARDANZA'] { background: var(--tinte-ambar); color: var(--txt-ambar); }
    .etq[data-estado='FALTA'] { background: var(--rojo-claro); color: var(--rojo); }
    .etq[data-estado='JUSTIFICADA'] { background: var(--tinte-azul); color: var(--txt-azul); }
    input.invalido { border-color: #c0392b; }
  `,
})
export class TabAsistencia implements OnInit {
  private readonly api = inject(AcademicoApi);
  readonly seccion = input.required<Seccion>();
  protected readonly estados = ESTADOS_ASISTENCIA;
  protected readonly nombre = NOMBRE_ASISTENCIA;
  protected readonly sesiones = signal<Sesion[]>([]);
  protected readonly alumnos = signal<FilaLibreta[]>([]);
  protected readonly idSesion = signal<number | null>(null);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly guardadas = signal<Marca[]>([]);
  protected readonly registrada = signal(false);
  protected readonly editando = signal(true);
  protected readonly intentoGuardar = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cerrada = computed(() => this.seccion().estado === 'CERRADA');
  protected readonly conteo = computed(() => {
    const c: Record<EstadoAsistencia, number> = { PRESENTE: 0, TARDANZA: 0, FALTA: 0, JUSTIFICADA: 0 };
    for (const m of this.marcas()) c[m.estado]++;
    return c;
  });

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

  protected faltaRazon(m: Marca): boolean {
    return this.intentoGuardar() && m.estado === 'JUSTIFICADA' && !m.observacion.trim();
  }

  protected elegir(valor: string): void {
    this.exito.set(null);
    this.error.set(null);
    this.intentoGuardar.set(false);
    const id = valor ? +valor : null;
    this.idSesion.set(id);
    if (!id) return;
    this.api.asistencia(id).subscribe({
      next: (previas) => {
        const lista = this.alumnos().map((f) => {
          const p = previas.find((a) => a.idMatricula === f.matricula.idMatricula);
          return {
            idMatricula: f.matricula.idMatricula,
            nombre: `${f.estudiante.apellidos}, ${f.estudiante.nombres}`,
            estado: p?.estado ?? 'PRESENTE',
            observacion: p?.observacion ?? '',
          };
        });
        this.marcas.set(lista);
        this.guardadas.set(lista);
        this.registrada.set(previas.length > 0);
        this.editando.set(previas.length === 0 && !this.cerrada());
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected marcar(i: number, e: EstadoAsistencia): void {
    this.marcas.update((l) => l.map((m, k) => (k === i ? { ...m, estado: e } : m)));
  }

  protected observar(i: number, texto: string): void {
    this.marcas.update((l) => l.map((m, k) => (k === i ? { ...m, observacion: texto } : m)));
  }

  protected todos(e: EstadoAsistencia): void {
    this.marcas.update((l) => l.map((m) => ({ ...m, estado: e })));
  }

  protected modificar(): void {
    this.exito.set(null);
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.marcas.set(this.guardadas());
    this.intentoGuardar.set(false);
    this.editando.set(false);
  }

  protected guardar(): void {
    const id = this.idSesion();
    if (!id) return;
    this.intentoGuardar.set(true);
    if (this.marcas().some((m) => m.estado === 'JUSTIFICADA' && !m.observacion.trim())) {
      this.error.set('Escribe la razón de cada estudiante marcado como justificado.');
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.api
      .registrarAsistencia(id, this.marcas().map((m) => ({ idMatricula: m.idMatricula, estado: m.estado, observacion: m.observacion.trim() || null })))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardadas.set(this.marcas());
          this.registrada.set(true);
          this.editando.set(false);
          this.intentoGuardar.set(false);
          this.exito.set('Asistencia guardada. Puedes modificarla cuando lo necesites.');
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(textoError(e));
        },
      });
  }
}
