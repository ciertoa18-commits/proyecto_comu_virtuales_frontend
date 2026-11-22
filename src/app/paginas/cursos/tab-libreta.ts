import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, Subject, switchMap } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { ComunicacionApi } from '../../core/api/comunicacion.api';
import { Evaluacion, FilaLibreta, NOTA_APROBATORIA, PermisoNota, Seccion, UsuarioResumen } from '../../core/modelos';
import { Modal } from '../../shared/modal';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { DialogoService } from '../../shared/dialogo';

@Component({
  selector: 'cv-tab-libreta',
  imports: [EtiquetaPipe, Icono, DatePipe, DecimalPipe, Modal],
  templateUrl: './tab-libreta.html',
  styleUrl: './tab-libreta.css',
})
export class TabLibreta implements OnInit {
  private readonly dialogo = inject(DialogoService);
  private readonly api = inject(AcademicoApi);
  private readonly comunicacion = inject(ComunicacionApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sesion = inject(SesionService);

  readonly seccion = input.required<Seccion>();
  readonly cerrada = output<void>();

  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly filas = signal<FilaLibreta[]>([]);
  protected readonly evaluaciones = signal<Evaluacion[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly guardando = signal<string | null>(null);
  protected readonly bloqueada = computed(() => this.seccion().estado === 'CERRADA');
  protected readonly activos = computed(() => this.filas().filter((f) => f.matricula.estado !== 'RETIRADO'));

  protected readonly resultados = signal<UsuarioResumen[]>([]);
  private readonly busqueda = new Subject<string>();
  protected readonly esDocente = this.sesion.rol() === 'DOCENTE';
  protected readonly permiso = signal<PermisoNota | null>(null);
  protected readonly modalPermiso = signal(false);
  protected readonly faltaMotivo = signal(false);
  protected readonly enviandoPermiso = signal(false);

  ngOnInit(): void {
    this.cargar();
    if (this.esDocente) this.api.permisoNota(this.seccion().idSeccion).subscribe({ next: (p) => this.permiso.set(p), error: () => undefined });
    this.busqueda
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length < 2 ? of([]) : this.comunicacion.buscarPersonas(q.trim()).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => this.resultados.set(r.filter((u) => u.rol === 'ESTUDIANTE')));
  }

  protected cargar(): void {
    const id = this.seccion().idSeccion;
    forkJoin({ filas: this.api.libreta(id), evaluaciones: this.api.evaluaciones(id) }).subscribe({
      next: ({ filas, evaluaciones }) => {
        this.filas.set([...filas].sort((a, b) => a.estudiante.apellidos.localeCompare(b.estudiante.apellidos)));
        this.evaluaciones.set(evaluaciones);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected nota(f: FilaLibreta, e: Evaluacion): number | null {
    return f.notas.find((n) => n.idEvaluacion === e.idEvaluacion)?.calificacion ?? null;
  }

  protected guardar(f: FilaLibreta, e: Evaluacion, campo: HTMLInputElement): void {
    const texto = campo.value.trim();
    const actual = this.nota(f, e);
    if (texto === '' || Number(texto) === actual) return;
    const valor = Number(texto);
    if (Number.isNaN(valor) || valor < 0 || valor > 20) {
      this.error.set('La nota debe estar entre 0 y 20.');
      campo.value = actual?.toString() ?? '';
      return;
    }
    if (actual !== null && this.esDocente && !this.permiso()?.vigente) {
      campo.value = actual.toString();
      return this.abrirPermiso();
    }
    this.error.set(null);
    const clave = `${f.matricula.idMatricula}-${e.idEvaluacion}`;
    this.guardando.set(clave);
    this.api.ponerNota({ idMatricula: f.matricula.idMatricula, idEvaluacion: e.idEvaluacion, calificacion: valor, comentarioDocente: null }).subscribe({
      next: () => {
        this.guardando.set(null);
        this.cargar();
      },
      error: (er) => {
        this.guardando.set(null);
        campo.value = actual?.toString() ?? '';
        const msg = textoError(er);
        if (msg.includes('permiso del administrador')) this.abrirPermiso();
        else this.error.set(msg);
      },
    });
  }

  protected buscar(q: string): void {
    this.busqueda.next(q);
  }

  protected matricular(u: UsuarioResumen, caja: HTMLInputElement): void {
    this.api.matricular(this.seccion().idSeccion, u.idUsuario).subscribe({
      next: () => {
        caja.value = '';
        this.resultados.set([]);
        this.exito.set(`${u.nombres} ${u.apellidos} fue matriculado.`);
        this.cargar();
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected async retirar(f: FilaLibreta): Promise<void> {
    if (!(await this.dialogo.confirmar(`¿Retirar a ${f.estudiante.nombres} ${f.estudiante.apellidos} de la sección?`, { titulo: 'Retirar estudiante', aceptar: 'Retirar', peligro: true }))) return;
    this.api.retirar(f.matricula.idMatricula).subscribe({ next: () => this.cargar(), error: (e) => this.error.set(textoError(e)) });
  }

  protected async cerrar(): Promise<void> {
    if (!(await this.dialogo.confirmar('Al cerrar la sección se calcula la nota final de cada estudiante (aprobado/desaprobado) y ya no se podrá editar. ¿Continuar?', { titulo: 'Cerrar sección', aceptar: 'Cerrar sección', peligro: true }))) return;
    this.api.cerrarSeccion(this.seccion().idSeccion).subscribe({
      next: () => {
        this.exito.set('Sección cerrada. Las notas finales quedaron registradas.');
        this.cerrada.emit();
        this.cargar();
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected abrirPermiso(): void {
    this.faltaMotivo.set(false);
    this.modalPermiso.set(true);
  }

  protected pedirPermiso(motivo: string): void {
    if (!motivo.trim()) return this.faltaMotivo.set(true);
    this.enviandoPermiso.set(true);
    this.api.solicitarPermisoNota(this.seccion().idSeccion, motivo.trim()).subscribe({
      next: (p) => {
        this.enviandoPermiso.set(false);
        this.permiso.set(p);
        this.modalPermiso.set(false);
        this.exito.set('Solicitud enviada al administrador.');
      },
      error: (e) => {
        this.enviandoPermiso.set(false);
        this.modalPermiso.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
