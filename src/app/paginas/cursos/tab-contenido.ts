import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { Archivo, Entrega, Evaluacion, Recurso, Seccion, Sesion, TIPOS_RECURSO, TipoRecurso, Unidad } from '../../core/modelos';
import { errorCampo, textoError } from '../../core/util/errores';
import { aFechaJava, aInputFecha, LIMITE_ARCHIVO } from '../../core/util/texto';
import { BotonDescarga } from '../../shared/boton-descarga';
import { Modal } from '../../shared/modal';
import { Icono, NombreIcono } from '../../shared/icono';
import { DialogoService } from '../../shared/dialogo';

interface Bloque { unidad: Unidad; sesiones: Sesion[]; recursos: Recurso[]; }

export const ICONO_RECURSO: Record<TipoRecurso, NombreIcono> = { DOCUMENTO: 'archivo', VIDEO: 'video', ENLACE: 'enlace', TAREA: 'pin' };

@Component({
  selector: 'cv-tab-contenido',
  imports: [Icono, DatePipe, ReactiveFormsModule, BotonDescarga, Modal],
  templateUrl: './tab-contenido.html',
  styleUrl: './tab-contenido.css',
})
export class TabContenido implements OnInit {
  private readonly dialogo = inject(DialogoService);
  private readonly api = inject(AcademicoApi);
  private readonly catalogo = inject(CatalogoApi);
  private readonly fb = inject(FormBuilder);

  readonly seccion = input.required<Seccion>();
  readonly docente = input(false);

  protected readonly icono = ICONO_RECURSO;
  protected readonly tipos = TIPOS_RECURSO;
  protected readonly errorCampo = errorCampo;
  protected readonly bloques = signal<Bloque[]>([]);
  protected readonly evaluaciones = signal<Evaluacion[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly cargando = signal(true);
  protected readonly cerrada = computed(() => this.seccion().estado === 'CERRADA');

  protected readonly modalUnidad = signal<Unidad | 'nueva' | null>(null);
  protected readonly modalSesion = signal<{ unidad: Unidad; sesion: Sesion | null } | null>(null);
  protected readonly modalRecurso = signal<Bloque | null>(null);
  protected readonly modalEntrega = signal<Recurso | null>(null);
  protected readonly modalEntregas = signal<{ recurso: Recurso; lista: Entrega[]; nombres: Record<number, string> } | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly archivo = signal<Archivo | null>(null);
  protected readonly subiendo = signal(false);

  protected readonly formUnidad = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    orden: [1, [Validators.required, Validators.min(1)]],
  });
  protected readonly formSesion = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    orden: [1, [Validators.required, Validators.min(1)]],
    fechaInicio: [''],
    duracionMin: [null as number | null],
    enlaceClase: [''],
  });
  protected readonly formRecurso = this.fb.group({
    tipo: ['DOCUMENTO' as TipoRecurso],
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: [''],
    idSesion: [null as number | null],
    urlExterna: [''],
    fechaEntrega: [''],
    permiteTardias: [false],
    idEvaluacion: [null as number | null],
  });

  ngOnInit(): void {
    this.cargar();
    if (this.docente()) this.api.evaluaciones(this.seccion().idSeccion).subscribe({ next: (e) => this.evaluaciones.set(e), error: () => undefined });
  }

  protected cargar(): void {
    this.api.unidades(this.seccion().idSeccion).subscribe({
      next: (unidades) => {
        if (!unidades.length) {
          this.bloques.set([]);
          this.cargando.set(false);
          return;
        }
        const ordenadas = [...unidades].sort((a, b) => a.orden - b.orden);
        forkJoin(ordenadas.map((u) => forkJoin({ sesiones: this.api.sesiones(u.idUnidad), recursos: this.api.recursos(u.idUnidad) }))).subscribe({
          next: (r) => {
            this.bloques.set(ordenadas.map((u, i) => ({ unidad: u, sesiones: [...r[i].sesiones].sort((a, b) => a.orden - b.orden), recursos: r[i].recursos })));
            this.cargando.set(false);
          },
          error: (e) => {
            this.cargando.set(false);
            this.error.set(textoError(e));
          },
        });
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  private hecho(msg: string): void {
    this.errorModal.set(null);
    this.exito.set(msg);
    this.cargar();
  }

  protected sesionDe(b: Bloque, id: number | null): string {
    return id ? (b.sesiones.find((s) => s.idSesion === id)?.titulo ?? '') : '';
  }

  protected abrirUnidad(u: Unidad | 'nueva'): void {
    this.errorModal.set(null);
    this.formUnidad.reset(u === 'nueva' ? { orden: this.bloques().length + 1 } : { nombre: u.nombre, descripcion: u.descripcion ?? '', orden: u.orden });
    this.modalUnidad.set(u);
  }
  protected guardarUnidad(): void {
    if (this.formUnidad.invalid) return this.formUnidad.markAllAsTouched();
    const v = this.formUnidad.getRawValue();
    const u = this.modalUnidad();
    this.api.guardarUnidad(this.seccion().idSeccion, u && u !== 'nueva' ? u.idUnidad : null, { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, orden: v.orden }).subscribe({
      next: () => {
        this.modalUnidad.set(null);
        this.hecho('Unidad guardada.');
      },
      error: (e) => this.errorModal.set(textoError(e)),
    });
  }
  protected async eliminarUnidad(u: Unidad): Promise<void> {
    if (!(await this.dialogo.confirmar(`¿Eliminar la unidad "${u.nombre}" y su contenido?`, { titulo: 'Eliminar unidad', aceptar: 'Eliminar', peligro: true }))) return;
    this.api.eliminarUnidad(u.idUnidad).subscribe({ next: () => this.hecho('Unidad eliminada.'), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrirSesion(b: Bloque, s: Sesion | null): void {
    this.errorModal.set(null);
    this.formSesion.reset(
      s
        ? { titulo: s.titulo, orden: s.orden, fechaInicio: aInputFecha(s.fechaInicio), duracionMin: s.duracionMin, enlaceClase: s.enlaceClase ?? '' }
        : { orden: b.sesiones.length + 1 },
    );
    this.modalSesion.set({ unidad: b.unidad, sesion: s });
  }
  protected guardarSesion(): void {
    const m = this.modalSesion();
    if (!m) return;
    if (this.formSesion.invalid) return this.formSesion.markAllAsTouched();
    const v = this.formSesion.getRawValue();
    this.api
      .guardarSesion(m.unidad.idUnidad, m.sesion?.idSesion ?? null, {
        titulo: v.titulo.trim(),
        orden: v.orden,
        fechaInicio: aFechaJava(v.fechaInicio),
        duracionMin: v.duracionMin || null,
        enlaceClase: v.enlaceClase.trim() || null,
      })
      .subscribe({
        next: () => {
          this.modalSesion.set(null);
          this.hecho('Sesión guardada.');
        },
        error: (e) => this.errorModal.set(textoError(e)),
      });
  }

  protected abrirRecurso(b: Bloque): void {
    this.errorModal.set(null);
    this.archivo.set(null);
    this.formRecurso.reset({ tipo: 'DOCUMENTO', permiteTardias: false });
    this.modalRecurso.set(b);
  }
  protected subir(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (f.size > LIMITE_ARCHIVO) return this.errorModal.set('El archivo supera los 50 MB.');
    this.subiendo.set(true);
    this.catalogo.subirArchivo(f).subscribe({
      next: (a) => {
        this.subiendo.set(false);
        this.archivo.set(a);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.errorModal.set(textoError(e));
      },
    });
  }
  protected guardarRecurso(): void {
    const b = this.modalRecurso();
    if (!b) return;
    if (this.formRecurso.invalid) return this.formRecurso.markAllAsTouched();
    const v = this.formRecurso.getRawValue();
    if ((v.tipo === 'ENLACE' || v.tipo === 'VIDEO') && !v.urlExterna?.trim() && !this.archivo()) return this.errorModal.set('Pega el enlace o sube el archivo.');
    if (v.tipo === 'DOCUMENTO' && !this.archivo()) return this.errorModal.set('Sube el documento.');
    if (v.tipo === 'TAREA' && !v.fechaEntrega) return this.errorModal.set('Indica la fecha límite de entrega.');
    this.api
      .guardarRecurso(b.unidad.idUnidad, null, {
        titulo: v.titulo!.trim(),
        descripcion: v.descripcion?.trim() || null,
        tipo: v.tipo!,
        idSesion: v.idSesion,
        idIdioma: null,
        idArchivo: this.archivo()?.idArchivo ?? null,
        urlExterna: v.urlExterna?.trim() || null,
        fechaEntrega: v.tipo === 'TAREA' ? aFechaJava(v.fechaEntrega) : null,
        permiteTardias: v.tipo === 'TAREA' && !!v.permiteTardias,
        idEvaluacion: v.tipo === 'TAREA' ? v.idEvaluacion : null,
      })
      .subscribe({
        next: () => {
          this.modalRecurso.set(null);
          this.hecho('Recurso publicado. Los estudiantes reciben una notificación.');
        },
        error: (e) => this.errorModal.set(textoError(e)),
      });
  }
  protected async eliminarRecurso(r: Recurso): Promise<void> {
    if (!(await this.dialogo.confirmar(`¿Eliminar "${r.titulo}"?`, { titulo: 'Eliminar recurso', aceptar: 'Eliminar', peligro: true }))) return;
    this.api.eliminarRecurso(r.idRecurso).subscribe({ next: () => this.hecho('Recurso eliminado.'), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrirEntrega(r: Recurso): void {
    this.errorModal.set(null);
    this.archivo.set(null);
    this.modalEntrega.set(r);
  }
  protected entregar(comentario: string): void {
    const r = this.modalEntrega();
    if (!r) return;
    if (!this.archivo() && !comentario.trim()) return this.errorModal.set('Adjunta tu archivo o escribe tu respuesta.');
    this.api.entregar(r.idRecurso, this.archivo()?.idArchivo ?? null, comentario.trim() || null).subscribe({
      next: (e) => {
        this.modalEntrega.set(null);
        this.exito.set(e.estado === 'TARDIA' ? 'Tarea entregada (fuera de plazo).' : '¡Tarea entregada!');
      },
      error: (e) => this.errorModal.set(textoError(e)),
    });
  }
  protected verEntregas(r: Recurso): void {
    forkJoin({ lista: this.api.entregas(r.idRecurso), libreta: this.api.libreta(this.seccion().idSeccion) }).subscribe({
      next: ({ lista, libreta }) => {
        const nombres: Record<number, string> = {};
        for (const f of libreta) nombres[f.matricula.idMatricula] = `${f.estudiante.nombres} ${f.estudiante.apellidos}`;
        this.modalEntregas.set({ recurso: r, lista, nombres });
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
