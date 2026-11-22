import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AcademicoApi } from '../../core/api/academico.api';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { Seccion, Silabo } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { BotonDescarga } from '../../shared/boton-descarga';
import { Icono, NombreIcono } from '../../shared/icono';

type Campo = 'sumilla' | 'competencias' | 'contenidos' | 'metodologia' | 'evaluacion' | 'bibliografia';

const SECCIONES: { campo: Campo; titulo: string; icono: NombreIcono; ayuda: string }[] = [
  { campo: 'sumilla', titulo: 'Sumilla', icono: 'info', ayuda: 'De qué trata el curso y su propósito.' },
  { campo: 'competencias', titulo: 'Competencias y capacidades', icono: 'estrella', ayuda: 'Lo que el estudiante logrará al terminar.' },
  { campo: 'contenidos', titulo: 'Contenidos por unidad', icono: 'lista', ayuda: 'Temas de cada unidad o semana. Escribe uno por línea.' },
  { campo: 'metodologia', titulo: 'Metodología', icono: 'brujula', ayuda: 'Cómo se desarrollarán las clases.' },
  { campo: 'evaluacion', titulo: 'Sistema de evaluación', icono: 'calculadora', ayuda: 'Instrumentos, pesos y fórmula del promedio.' },
  { campo: 'bibliografia', titulo: 'Bibliografía', icono: 'libro', ayuda: 'Libros, artículos y enlaces de consulta.' },
];

@Component({
  selector: 'cv-tab-silabo',
  imports: [DatePipe, ReactiveFormsModule, BotonDescarga, Icono],
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }

    @if (editando()) {
      <form class="tarjeta tarjeta-plana" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <h2>{{ silabo() ? 'Editar sílabo' : 'Crear sílabo' }}</h2>
        @for (s of secciones; track s.campo) {
          <label [for]="'s-' + s.campo">{{ s.titulo }}</label>
          <textarea [id]="'s-' + s.campo" maxlength="4000" [placeholder]="s.ayuda" [rows]="s.campo === 'contenidos' ? 8 : 4" [formControlName]="s.campo"></textarea>
          <small class="ayuda">{{ form.controls[s.campo].value.length }}/4000</small>
        }
        <span class="rotulo">Sílabo en PDF (opcional)</span>
        <div class="adjunto">
          <label class="btn btn-chico"><cv-icono nombre="clip" [tamano]="16" /> {{ subiendo() ? 'Subiendo...' : nombreArchivo() ?? (form.controls.idArchivo.value ? 'Cambiar PDF' : 'Adjuntar PDF') }}
            <input type="file" accept=".pdf,application/pdf" hidden (change)="subir($event)" />
          </label>
          @if (form.controls.idArchivo.value) { <button class="btn btn-chico btn-peligro" type="button" (click)="quitarArchivo()"><cv-icono nombre="basura" [tamano]="16" /> Quitar</button> }
        </div>
        <div class="botones">
          <button class="btn" type="button" (click)="cancelar()">Cancelar</button>
          <button class="btn btn-primario" type="submit" [disabled]="guardando() || subiendo()">{{ guardando() ? 'Guardando...' : 'Guardar sílabo' }}</button>
        </div>
      </form>
    } @else if (silabo(); as s) {
      <section class="silabo">
        <header>
          <div><h2>Sílabo</h2><small class="apagado">Actualizado el {{ s.fechaActualizacion | date: "d 'de' MMMM 'de' y" }}</small></div>
          <div class="acciones">
            @if (s.idArchivo) { <cv-descarga [idArchivo]="s.idArchivo" texto="Descargar PDF" /> }
            @if (docente()) { <button class="btn btn-chico" type="button" (click)="editar()"><cv-icono nombre="lapiz" [tamano]="16" /> Editar</button> }
          </div>
        </header>
        @for (sec of conContenido(); track sec.campo) {
          <article>
            <h3><cv-icono [nombre]="sec.icono" [tamano]="18" /> {{ sec.titulo }}</h3>
            <p class="texto">{{ s[sec.campo] }}</p>
          </article>
        }
      </section>
    } @else {
      <div class="bloque vacio-silabo">
        <cv-icono nombre="portapapeles" [tamano]="44" />
        <p>{{ cargando() ? 'Cargando sílabo...' : docente() ? 'Esta sección todavía no tiene sílabo.' : 'El docente aún no publica el sílabo de este curso.' }}</p>
        @if (docente() && !cargando()) { <button class="btn btn-primario" type="button" (click)="editar()"><cv-icono nombre="mas" [tamano]="16" /> Crear sílabo</button> }
      </div>
    }
  `,
  styles: `
    .btn { display: inline-flex; align-items: center; gap: .3rem; }
    .silabo header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .silabo header h2 { margin: 0; }
    .acciones { display: flex; gap: .4rem; flex-wrap: wrap; }
    .silabo article { background: var(--superficie); border-radius: 12px; padding: 14px 18px; margin-bottom: .8rem; box-shadow: 0 1px 6px rgba(0, 0, 0, .05); border-left: 4px solid var(--coral); }
    .silabo h3 { display: flex; align-items: center; gap: .4rem; margin: 0 0 .4rem; font-size: 1rem; color: var(--acento-texto-osc); }
    .texto { white-space: pre-wrap; margin: 0; color: var(--ink); line-height: 1.5; }
    .vacio-silabo { display: flex; flex-direction: column; align-items: center; gap: .6rem; text-align: center; color: var(--muted); padding: 2rem; }
    .adjunto { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .6rem; }
    textarea { resize: vertical; }
  `,
})
export class TabSilabo implements OnInit {
  private readonly api = inject(AcademicoApi);
  private readonly catalogo = inject(CatalogoApi);
  readonly seccion = input.required<Seccion>();
  readonly docente = input(false);

  protected readonly secciones = SECCIONES;
  protected readonly silabo = signal<Silabo | null>(null);
  protected readonly cargando = signal(true);
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly nombreArchivo = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly conContenido = computed(() => {
    const s = this.silabo();
    return s ? SECCIONES.filter((x) => s[x.campo]) : [];
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    sumilla: ['', Validators.maxLength(4000)],
    competencias: ['', Validators.maxLength(4000)],
    contenidos: ['', Validators.maxLength(4000)],
    metodologia: ['', Validators.maxLength(4000)],
    evaluacion: ['', Validators.maxLength(4000)],
    bibliografia: ['', Validators.maxLength(4000)],
    idArchivo: [null as number | null],
  });

  ngOnInit(): void {
    this.api.silabo(this.seccion().idSeccion).subscribe({
      next: (s) => {
        this.silabo.set(s);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected editar(): void {
    const s = this.silabo();
    this.exito.set(null);
    this.error.set(null);
    this.nombreArchivo.set(null);
    this.form.reset({
      sumilla: s?.sumilla ?? '',
      competencias: s?.competencias ?? '',
      contenidos: s?.contenidos ?? '',
      metodologia: s?.metodologia ?? '',
      evaluacion: s?.evaluacion ?? '',
      bibliografia: s?.bibliografia ?? '',
      idArchivo: s?.idArchivo ?? null,
    });
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.editando.set(false);
    this.error.set(null);
  }

  protected subir(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) || f.size > 50 * 1024 * 1024) return this.error.set('El sílabo debe ser un PDF de máximo 50 MB.');
    this.subiendo.set(true);
    this.catalogo.subirArchivo(f).subscribe({
      next: (a) => {
        this.subiendo.set(false);
        this.form.controls.idArchivo.setValue(a.idArchivo);
        this.nombreArchivo.set(a.nombreOriginal);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected quitarArchivo(): void {
    this.form.controls.idArchivo.setValue(null);
    this.nombreArchivo.set(null);
  }

  protected guardar(): void {
    const v = this.form.getRawValue();
    const limpio = (t: string) => t.trim() || null;
    const datos = {
      sumilla: limpio(v.sumilla),
      competencias: limpio(v.competencias),
      contenidos: limpio(v.contenidos),
      metodologia: limpio(v.metodologia),
      evaluacion: limpio(v.evaluacion),
      bibliografia: limpio(v.bibliografia),
      idArchivo: v.idArchivo,
    };
    if (!datos.sumilla && !datos.contenidos && !datos.idArchivo) return this.error.set('Escribe al menos la sumilla o los contenidos, o adjunta el sílabo en PDF.');
    this.guardando.set(true);
    this.api.guardarSilabo(this.seccion().idSeccion, datos).subscribe({
      next: (s) => {
        this.guardando.set(false);
        this.silabo.set(s);
        this.editando.set(false);
        this.error.set(null);
        this.exito.set('Sílabo guardado. Tus estudiantes ya pueden verlo.');
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
