import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../core/api/admin.api';
import { dominioCorreo, EstadoUsuario, mensajeCorreo, NOMBRE_ROL, PATRON_TELEFONO, patronCorreo, Rol, UsuarioResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { iniciales } from '../../core/util/texto';
import { Modal } from '../../shared/modal';
import { Paginador } from '../../shared/paginador';

/** Panel del admin: aprobar docentes, activar/desactivar, crear usuarios y poner contraseña nueva. */
@Component({
  selector: 'cv-usuarios',
  imports: [DatePipe, ReactiveFormsModule, Modal, Paginador],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  protected readonly sesion = inject(SesionService);

  /** ?estado=PENDIENTE desde el aviso del inicio. */
  readonly estado = input<string>();

  protected readonly nombreRol = NOMBRE_ROL;
  protected readonly iniciales = iniciales;
  protected readonly errorCampo = errorCampo;
  protected readonly dominioCorreo = dominioCorreo;
  protected readonly mensajeCorreo = mensajeCorreo;
  protected readonly msgTelefono = 'Debe tener 9 dígitos.';
  protected readonly estados: Record<EstadoUsuario, string> = { ACTIVO: 'Activo', INACTIVO: 'Inactivo', PENDIENTE: 'Pendiente' };

  protected readonly usuarios = signal<UsuarioResumen[]>([]);
  protected readonly pendientes = signal(0);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly filtro = signal<{ q: string; rol: Rol | ''; estado: EstadoUsuario | '' }>({ q: '', rol: '', estado: '' });

  protected readonly modalNuevo = signal(false);
  protected readonly modalClave = signal<UsuarioResumen | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});

  protected readonly formNuevo = this.fb.nonNullable.group({
    rol: ['DOCENTE' as Rol],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.pattern(patronCorreo('DOCENTE'))]],
    telefono: ['', Validators.pattern(PATRON_TELEFONO)],
    especialidad: ['', Validators.maxLength(100)],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
  });
  protected readonly formClave = this.fb.nonNullable.group({
    nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
  });

  constructor() {
    // El dominio del correo depende del rol: estudiante @perueduca.pe, docente/admin @minedu.gob.pe
    this.formNuevo.controls.rol.valueChanges.subscribe((rol) => {
      const c = this.formNuevo.controls.correo;
      c.setValidators([Validators.required, Validators.pattern(patronCorreo(rol))]);
      c.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    if (this.estado() === 'PENDIENTE') this.filtro.set({ q: '', rol: '', estado: 'PENDIENTE' });
    this.cargar(0);
  }

  protected cargar(p: number): void {
    this.cargando.set(true);
    this.api.usuarios({ ...this.filtro(), page: p }).subscribe({
      next: (r) => {
        this.usuarios.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
        this.total.set(r.page.totalElements);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
    this.api.usuarios({ estado: 'PENDIENTE', size: 1 }).subscribe({ next: (r) => this.pendientes.set(r.page.totalElements), error: () => undefined });
  }

  protected filtrar(q: string, rol: string, estado: string): void {
    this.filtro.set({ q: q.trim(), rol: rol as Rol | '', estado: estado as EstadoUsuario | '' });
    this.cargar(0);
  }

  private listo(msg: string): void {
    this.error.set(null);
    this.exito.set(msg);
    this.cargar(this.pagina());
  }

  protected aprobar(u: UsuarioResumen): void {
    this.api.aprobar(u.idUsuario).subscribe({ next: () => this.listo(`✅ Se aprobó a ${u.nombres} ${u.apellidos}. Ya puede ingresar.`), error: (e) => this.error.set(textoError(e)) });
  }

  protected estadoNuevo(u: UsuarioResumen, estado: EstadoUsuario): void {
    const accion = u.estado === 'PENDIENTE' ? 'rechazar la solicitud de' : estado === 'INACTIVO' ? 'desactivar a' : 'activar a';
    if (!confirm(`¿Seguro que quieres ${accion} ${u.nombres} ${u.apellidos}?`)) return;
    this.api.cambiarEstado(u.idUsuario, estado).subscribe({
      next: () => this.listo(estado === 'ACTIVO' ? 'Cuenta activada.' : u.estado === 'PENDIENTE' ? 'Solicitud rechazada.' : 'Cuenta desactivada.'),
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected abrirNuevo(): void {
    this.formNuevo.reset();
    this.errorModal.set(null);
    this.delServidor.set({});
    this.modalNuevo.set(true);
  }

  protected err(c: keyof typeof this.formNuevo.controls, formato?: string): string | null {
    return this.delServidor()[c] ?? errorCampo(this.formNuevo.controls[c], formato);
  }

  protected crear(): void {
    if (this.formNuevo.invalid) return this.formNuevo.markAllAsTouched();
    const v = this.formNuevo.getRawValue();
    this.api
      .crearUsuario({
        ...v,
        nombres: v.nombres.trim(),
        apellidos: v.apellidos.trim(),
        correo: v.correo.trim().toLowerCase(),
        telefono: v.telefono.trim() || null,
        especialidad: v.rol === 'DOCENTE' ? v.especialidad.trim() || null : null,
      })
      .subscribe({
        next: (u) => {
          this.modalNuevo.set(false);
          this.listo(`Se creó la cuenta de ${u.nombres} ${u.apellidos} (${NOMBRE_ROL[u.rol]}).`);
        },
        error: (e) => {
          this.delServidor.set(erroresPorCampo(e));
          this.errorModal.set(textoError(e));
        },
      });
  }

  protected abrirClave(u: UsuarioResumen): void {
    this.formClave.reset();
    this.errorModal.set(null);
    this.modalClave.set(u);
  }

  protected guardarClave(): void {
    const u = this.modalClave();
    if (!u) return;
    if (this.formClave.invalid) return this.formClave.markAllAsTouched();
    this.api.nuevaPassword(u.idUsuario, this.formClave.getRawValue().nueva).subscribe({
      next: () => {
        this.modalClave.set(null);
        this.listo(`Contraseña de ${u.nombres} cambiada. Compártela por un medio seguro.`);
      },
      error: (e) => this.errorModal.set(textoError(e)),
    });
  }
}
