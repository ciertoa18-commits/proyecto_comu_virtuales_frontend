import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Evento } from '../../core/modelos';
import { errorCampo, textoError } from '../../core/util/errores';
import { aFechaJava } from '../../core/util/texto';
import { Modal } from '../../shared/modal';
import { SiPuede } from '../../shared/si-puede';

@Component({
  selector: 'cv-tab-eventos',
  imports: [DatePipe, ReactiveFormsModule, Modal, SiPuede],
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="cabecera">
      <h2>Eventos</h2>
      <button *siPuede="'EVENTO_CREAR'" class="btn btn-primario btn-chico" type="button" (click)="abrir()">+ Nuevo evento</button>
    </div>
    @if (proximos().length) {
      @for (e of proximos(); track e.idEvento) {
        <div class="bloque evento">
          <div class="fecha"><b>{{ e.fechaInicio | date: 'dd' }}</b><span>{{ e.fechaInicio | date: 'MMM' }}</span></div>
          <div class="info">
            <strong>{{ e.titulo }}</strong>
            <div class="apagado">{{ e.fechaInicio | date: "EEEE, HH:mm" }}@if (e.fechaFin) { – {{ e.fechaFin | date: 'HH:mm' }} }</div>
            @if (e.descripcion) { <p>{{ e.descripcion }}</p> }
          </div>
          @if (e.enlace) { <a class="btn btn-chico btn-primario" [href]="e.enlace" target="_blank" rel="noopener">Unirme</a> }
        </div>
      }
    } @else {
      <p class="vacio">No hay eventos próximos.</p>
    }
    @if (pasados().length) {
      <details class="pasados"><summary>Eventos pasados ({{ pasados().length }})</summary>
        @for (e of pasados(); track e.idEvento) { <div class="fila"><span>{{ e.titulo }}</span><span class="apagado">{{ e.fechaInicio | date: 'dd/MM/yyyy' }}</span></div> }
      </details>
    }
    @if (modal()) {
      <cv-modal titulo="Nuevo evento" (cerrar)="modal.set(false)">
        @if (errorModal()) { <div class="alerta">{{ errorModal() }}</div> }
        <form class="tarjeta" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          <label for="et">Título</label><input id="et" maxlength="200" formControlName="titulo" />
          @if (errorCampo(form.controls.titulo); as m) { <small class="campo-error">{{ m }}</small> }
          <label for="ed">Descripción</label><textarea id="ed" maxlength="1000" formControlName="descripcion"></textarea>
          <div class="dos-columnas">
            <div><label for="ei">Inicio</label><input id="ei" type="datetime-local" formControlName="fechaInicio" />
              @if (errorCampo(form.controls.fechaInicio); as m) { <small class="campo-error">{{ m }}</small> }</div>
            <div><label for="ef">Fin (opcional)</label><input id="ef" type="datetime-local" formControlName="fechaFin" /></div>
          </div>
          <label for="el">Enlace (Meet, Zoom...)</label><input id="el" type="url" formControlName="enlace" />
          <div class="botones"><button class="btn" type="button" (click)="modal.set(false)">Cancelar</button><button class="btn btn-primario" type="submit">Crear</button></div>
        </form>
      </cv-modal>
    }
  `,
  styles: `
    .evento { display: flex; gap: 16px; align-items: center; }
    .fecha { width: 58px; height: 62px; border-radius: 12px; background: var(--coral); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: none; }
    .fecha b { font-size: 1.4rem; line-height: 1; }
    .fecha span { font-size: .72rem; text-transform: uppercase; }
    .info { flex: 1; }
    .info p { margin: .3rem 0 0; color: #444; font-size: .9rem; }
    .pasados { margin-top: 1rem; background: #fff; border-radius: 12px; padding: .8rem 1rem; }
    summary { cursor: pointer; font-weight: 600; }
  `,
})
export class TabEventos implements OnInit {
  private readonly api = inject(ComunidadApi);
  readonly idComunidad = input.required<number>();
  protected readonly eventos = signal<Evento[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly modal = signal(false);
  protected readonly errorCampo = errorCampo;

  protected readonly proximos = computed(() =>
    this.eventos().filter((e) => new Date(e.fechaFin ?? e.fechaInicio) >= new Date()).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
  );
  protected readonly pasados = computed(() => this.eventos().filter((e) => new Date(e.fechaFin ?? e.fechaInicio) < new Date()));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: [''],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    enlace: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.eventos(this.idComunidad()).subscribe({ next: (e) => this.eventos.set(e), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrir(): void {
    this.form.reset();
    this.errorModal.set(null);
    this.modal.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    this.api
      .crearEvento(this.idComunidad(), {
        titulo: v.titulo.trim(),
        descripcion: v.descripcion.trim() || null,
        fechaInicio: aFechaJava(v.fechaInicio)!,
        fechaFin: aFechaJava(v.fechaFin),
        enlace: v.enlace.trim() || null,
        idSeccion: null,
      })
      .subscribe({
        next: () => {
          this.modal.set(false);
          this.cargar();
        },
        error: (e) => this.errorModal.set(textoError(e)),
      });
  }
}
