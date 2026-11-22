import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoApi } from '../../core/api/academico.api';
import { Evaluacion, Seccion, TIPOS_EVALUACION, TipoEvaluacion, Unidad } from '../../core/modelos';
import { errorCampo, textoError } from '../../core/util/errores';
import { aFechaJava } from '../../core/util/texto';

@Component({
  selector: 'cv-tab-evaluaciones',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="dos">
      <section>
        <h2>Evaluaciones</h2>
        <div class="medidor"><div class="lleno" [style.width.%]="sumaPesos() > 100 ? 100 : sumaPesos()" [class.pasado]="sumaPesos() > 100"></div></div>
        <p class="apagado">Peso total: <strong>{{ sumaPesos() | number: '1.0-2' }}%</strong> de 100%</p>
        <div class="tabla-scroll">
          <table class="tabla">
            <thead><tr><th>Nombre</th><th>Tipo</th><th class="numero">Peso</th><th>Fecha</th></tr></thead>
            <tbody>
              @for (e of evaluaciones(); track e.idEvaluacion) {
                <tr><td>{{ e.nombre }}</td><td><span class="pill azul">{{ e.tipo }}</span></td><td class="numero">{{ e.peso }}%</td><td>{{ e.fecha ? (e.fecha | date: 'dd/MM/yyyy') : '—' }}</td></tr>
              } @empty {
                <tr><td colspan="4" class="vacio">Aún no hay evaluaciones.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      @if (seccion().estado !== 'CERRADA') {
        <form class="tarjeta" [formGroup]="form" (ngSubmit)="crear()" novalidate>
          <h2>Nueva evaluación</h2>
          @if (exito()) { <div class="exito">{{ exito() }}</div> }
          <label for="en">Nombre</label><input id="en" maxlength="100" formControlName="nombre" placeholder="Examen parcial" />
          @if (errorCampo(form.controls.nombre); as m) { <small class="campo-error">{{ m }}</small> }
          <label for="et">Tipo</label>
          <select id="et" formControlName="tipo">@for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }</select>
          <label for="ep">Peso (%)</label><input id="ep" type="number" min="0.01" max="100" step="0.01" formControlName="peso" />
          @if (errorCampo(form.controls.peso); as m) { <small class="campo-error">{{ m }}</small> }
          <label for="eu">Unidad (opcional)</label>
          <select id="eu" formControlName="idUnidad"><option [ngValue]="null">Ninguna</option>@for (u of unidades(); track u.idUnidad) { <option [ngValue]="u.idUnidad">{{ u.nombre }}</option> }</select>
          <label for="ef">Fecha (opcional)</label><input id="ef" type="datetime-local" formControlName="fecha" />
          <div class="botones"><button class="btn btn-primario" type="submit">Crear evaluación</button></div>
        </form>
      }
    </div>
  `,
  styles: `
    .dos { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.4rem; align-items: start; }
    .medidor { height: 10px; background: var(--superficie-2); border-radius: 6px; overflow: hidden; }
    .lleno { height: 100%; background: var(--verde); }
    .lleno.pasado { background: var(--coral); }
    @media (max-width: 900px) { .dos { grid-template-columns: 1fr; } }
  `,
})
export class TabEvaluaciones implements OnInit {
  private readonly api = inject(AcademicoApi);
  readonly seccion = input.required<Seccion>();
  protected readonly tipos = TIPOS_EVALUACION;
  protected readonly errorCampo = errorCampo;
  protected readonly evaluaciones = signal<Evaluacion[]>([]);
  protected readonly unidades = signal<Unidad[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly sumaPesos = computed(() => this.evaluaciones().reduce((s, e) => s + Number(e.peso), 0));

  protected readonly form = inject(FormBuilder).group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['PRACTICA' as TipoEvaluacion],
    peso: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    idUnidad: [null as number | null],
    fecha: [''],
  });

  ngOnInit(): void {
    this.cargar();
    this.api.unidades(this.seccion().idSeccion).subscribe({ next: (u) => this.unidades.set(u), error: () => undefined });
  }

  private cargar(): void {
    this.api.evaluaciones(this.seccion().idSeccion).subscribe({ next: (e) => this.evaluaciones.set(e), error: (e) => this.error.set(textoError(e)) });
  }

  protected crear(): void {
    this.error.set(null);
    this.exito.set(null);
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    this.api
      .crearEvaluacion(this.seccion().idSeccion, { nombre: v.nombre!.trim(), tipo: v.tipo!, peso: Number(v.peso), idUnidad: v.idUnidad, fecha: aFechaJava(v.fecha) })
      .subscribe({
        next: () => {
          this.form.reset({ tipo: 'PRACTICA' });
          this.exito.set('Evaluación creada.');
          this.cargar();
        },
        error: (e) => this.error.set(textoError(e)),
      });
  }
}
