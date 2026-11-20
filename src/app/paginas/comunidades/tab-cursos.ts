import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { AdminApi } from '../../core/api/admin.api';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { Curso, Periodo, Seccion, UsuarioResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { PersonasService } from '../../core/util/personas.service';
import { errorCampo, textoError } from '../../core/util/errores';
import { Modal } from '../../shared/modal';
import { SiPuede } from '../../shared/si-puede';
import { Icono } from '../../shared/icono';
import { DialogoService } from '../../shared/dialogo';

@Component({
  selector: 'cv-tab-cursos',
  imports: [Icono, ReactiveFormsModule, RouterLink, Modal, SiPuede],
  templateUrl: './tab-cursos.html',
  styleUrl: './tab-cursos.css',
})
export class TabCursos implements OnInit {
  private readonly dialogo = inject(DialogoService);
  private readonly api = inject(AcademicoApi);
  private readonly admin = inject(AdminApi);
  private readonly catalogo = inject(CatalogoApi);
  private readonly fb = inject(FormBuilder);
  protected readonly sesion = inject(SesionService);
  protected readonly personas = inject(PersonasService);

  readonly idComunidad = input.required<number>();

  protected readonly cursos = signal<Curso[]>([]);
  protected readonly secciones = signal<Record<number, Seccion[]>>({});
  protected readonly abierto = signal<number | null>(null);
  protected readonly misSecciones = signal<Set<number>>(new Set());
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly docentes = signal<UsuarioResumen[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  protected readonly modalCurso = signal<Curso | 'nuevo' | null>(null);
  protected readonly modalSeccion = signal<Curso | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly errorCampo = errorCampo;

  protected readonly formCurso = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(20)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', Validators.maxLength(1000)],
  });
  protected readonly formSeccion = this.fb.group({
    idPeriodo: [null as number | null, Validators.required],
    idDocente: [null as number | null, Validators.required],
    grupo: ['', [Validators.required, Validators.maxLength(10)]],
    cupoMaximo: [null as number | null, Validators.min(1)],
    salaVirtual: ['', Validators.maxLength(500)],
  });

  protected readonly esAdmin = computed(() => this.sesion.rol() === 'ADMIN');

  ngOnInit(): void {
    this.cargar();
    this.api.misSecciones().subscribe({ next: (l) => this.misSecciones.set(new Set(l.map((s) => s.idSeccion))), error: () => undefined });
  }

  private cargar(): void {
    this.api.cursos(this.idComunidad()).subscribe({ next: (c) => this.cursos.set(c), error: (e) => this.error.set(textoError(e)) });
  }

  protected alternar(c: Curso): void {
    if (this.abierto() === c.idCurso) return this.abierto.set(null);
    this.abierto.set(c.idCurso);
    this.cargarSecciones(c.idCurso);
  }

  private cargarSecciones(idCurso: number): void {
    this.api.secciones(idCurso).subscribe({
      next: (s) => this.secciones.update((m) => ({ ...m, [idCurso]: s })),
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected matricular(s: Seccion): void {
    this.error.set(null);
    this.api.matricular(s.idSeccion).subscribe({
      next: () => {
        this.misSecciones.update((x) => new Set([...x, s.idSeccion]));
        this.exito.set('¡Te matriculaste! Ya puedes entrar a la sección.');
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected puedeEntrar(s: Seccion): boolean {
    return this.esAdmin() || s.idDocente === this.sesion.sesion()?.idUsuario || this.misSecciones().has(s.idSeccion);
  }

  protected abrirCurso(c: Curso | 'nuevo'): void {
    this.errorModal.set(null);
    this.formCurso.reset(c === 'nuevo' ? {} : { codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion ?? '' });
    this.modalCurso.set(c);
  }

  protected guardarCurso(): void {
    if (this.formCurso.invalid) return this.formCurso.markAllAsTouched();
    const v = this.formCurso.getRawValue();
    const d = { codigo: v.codigo.trim(), nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };
    const c = this.modalCurso();
    (c && c !== 'nuevo' ? this.api.editarCurso(c.idCurso, d) : this.api.crearCurso(this.idComunidad(), d)).subscribe({
      next: () => {
        this.modalCurso.set(null);
        this.exito.set('Curso guardado.');
        this.cargar();
      },
      error: (e) => this.errorModal.set(textoError(e)),
    });
  }

  protected async eliminarCurso(c: Curso): Promise<void> {
    if (!(await this.dialogo.confirmar(`¿Eliminar el curso "${c.nombre}"?`, { titulo: 'Eliminar curso', aceptar: 'Eliminar', peligro: true }))) return;
    this.api.eliminarCurso(c.idCurso).subscribe({ next: () => this.cargar(), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrirSeccion(c: Curso): void {
    this.errorModal.set(null);
    this.formSeccion.reset();
    if (!this.periodos().length) this.catalogo.periodos().subscribe({ next: (p) => this.periodos.set(p) });
    if (!this.docentes().length) {
      this.admin.usuarios({ rol: 'DOCENTE', estado: 'ACTIVO', size: 100 }).subscribe({ next: (p) => this.docentes.set(p.content) });
    }
    this.modalSeccion.set(c);
  }

  protected guardarSeccion(): void {
    const c = this.modalSeccion();
    if (!c) return;
    if (this.formSeccion.invalid) return this.formSeccion.markAllAsTouched();
    const v = this.formSeccion.getRawValue();
    this.api
      .crearSeccion(c.idCurso, {
        idPeriodo: v.idPeriodo!,
        idDocente: v.idDocente!,
        grupo: v.grupo!.trim(),
        cupoMaximo: v.cupoMaximo || null,
        salaVirtual: v.salaVirtual?.trim() || null,
      })
      .subscribe({
        next: () => {
          this.modalSeccion.set(null);
          this.exito.set('Sección creada.');
          this.cargarSecciones(c.idCurso);
        },
        error: (e) => this.errorModal.set(textoError(e)),
      });
  }
}
