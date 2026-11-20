import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval, takeWhile } from 'rxjs';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { CuentaApi } from '../../core/api/cuenta.api';
import { EstadoUsuario, NOMBRE_ROL, PATRON_TELEFONO, Usuario } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { iniciales, LIMITE_FOTO } from '../../core/util/texto';
import { Icono } from '../../shared/icono';
import { ImagenArchivo } from '../../shared/imagen-archivo';
import { mismasClaves } from '../publico/registro';

@Component({
  selector: 'cv-perfil',
  imports: [ReactiveFormsModule, DatePipe, Icono, ImagenArchivo],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private readonly cuenta = inject(CuentaApi);
  private readonly sesion = inject(SesionService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly idiomas = toSignal(inject(CatalogoApi).idiomas$, { initialValue: [] });

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly misIdiomas = signal<number[]>([]);
  protected readonly seleccion = signal(new Set<number>());
  protected readonly pestana = signal<'datos' | 'seguridad'>('datos');
  protected readonly editando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly subiendo = signal(false);
  protected readonly destinoCodigo = signal<string | null>(null);
  protected readonly enviandoCodigo = signal(false);
  protected readonly espera = signal(0);
  protected readonly msgTelefono = 'Debe tener 9 dígitos.';
  protected readonly errorCampo = errorCampo;
  protected readonly nombreEstado: Record<EstadoUsuario, string> = { ACTIVO: 'Activa', INACTIVO: 'Inactiva', PENDIENTE: 'Pendiente' };

  protected readonly iniciales = computed(() => iniciales(this.usuario() ? `${this.usuario()!.nombres} ${this.usuario()!.apellidos}` : ''));
  protected readonly rol = computed(() => NOMBRE_ROL[this.sesion.rol() ?? 'ESTUDIANTE'].toUpperCase());
  protected readonly esDocente = computed(() => this.sesion.rol() === 'DOCENTE');
  protected readonly nombreIdioma = computed(() => Object.fromEntries(this.idiomas().map((i) => [i.idIdioma, i.nombre])) as Record<number, string>);

  protected readonly formDatos = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    especialidad: [null as string | null, Validators.maxLength(100)],
    telefono: [null as string | null, Validators.pattern(PATRON_TELEFONO)],
    correoRecuperacion: [null as string | null, [Validators.required, Validators.email, Validators.maxLength(150)]],
    idIdiomaPref: [null as number | null],
  });
  protected readonly formClave = this.fb.nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    },
    { validators: mismasClaves('nueva', 'confirmar') },
  );

  ngOnInit(): void {
    this.cuenta.yo().subscribe({
      next: ({ usuario, idiomas }) => {
        this.usuario.set(usuario);
        this.misIdiomas.set(idiomas ?? []);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  private limpiar(): void {
    this.error.set(null);
    this.exito.set(null);
    this.delServidor.set({});
  }

  protected editar(): void {
    const u = this.usuario();
    if (!u) return;
    this.limpiar();
    this.formDatos.reset({
      nombres: u.nombres,
      apellidos: u.apellidos,
      especialidad: u.especialidad,
      telefono: u.telefono,
      correoRecuperacion: u.correoRecuperacion,
      idIdiomaPref: u.idIdiomaPref,
    });
    this.seleccion.set(new Set(this.misIdiomas()));
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.limpiar();
    this.editando.set(false);
  }

  protected alternarIdioma(id: number): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected guardar(): void {
    this.limpiar();
    if (this.formDatos.invalid) return this.formDatos.markAllAsTouched();
    const v = this.formDatos.getRawValue();
    const idiomas = [...this.seleccion()];
    this.cuenta
      .guardarPerfil({
        nombres: v.nombres!.trim(),
        apellidos: v.apellidos!.trim(),
        especialidad: v.especialidad?.trim() || null,
        telefono: v.telefono?.trim() || null,
        correoRecuperacion: v.correoRecuperacion!.trim().toLowerCase(),
        idIdiomaPref: v.idIdiomaPref,
        idiomas,
      })
      .subscribe({
        next: (u) => {
          this.usuario.set(u);
          this.misIdiomas.set(idiomas);
          this.editando.set(false);
          this.sesion.renombrar(`${u.nombres} ${u.apellidos}`);
          this.exito.set('Tus datos fueron actualizados.');
        },
        error: (e) => {
          this.delServidor.set(erroresPorCampo(e));
          this.error.set(textoError(e));
        },
      });
  }

  protected foto(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    this.limpiar();
    if (!/\.(jpe?g|png)$/i.test(f.name) || f.size > LIMITE_FOTO) return this.error.set('La foto debe ser JPG o PNG de máximo 2 MB.');
    this.subiendo.set(true);
    this.cuenta.cambiarFoto(f).subscribe({
      next: (u) => {
        this.subiendo.set(false);
        this.usuario.set(u);
        this.exito.set('Tu foto fue actualizada.');
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected pedirCodigo(): void {
    this.limpiar();
    const c = this.formClave.controls;
    if (c.actual.invalid || c.nueva.invalid || c.confirmar.invalid || this.formClave.hasError('distintas')) {
      c.actual.markAsTouched();
      c.nueva.markAsTouched();
      c.confirmar.markAsTouched();
      return;
    }
    this.enviandoCodigo.set(true);
    this.cuenta.pedirCodigoPassword().subscribe({
      next: ({ destino }) => {
        this.enviandoCodigo.set(false);
        this.destinoCodigo.set(destino);
        this.iniciarEspera();
      },
      error: (e) => {
        this.enviandoCodigo.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  private iniciarEspera(): void {
    this.espera.set(60);
    interval(1000)
      .pipe(
        takeWhile(() => this.espera() > 0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.espera.update((s) => s - 1));
  }

  protected cambiarClave(): void {
    this.limpiar();
    if (this.formClave.invalid) return this.formClave.markAllAsTouched();
    const { actual, nueva, codigo } = this.formClave.getRawValue();
    this.cuenta.cambiarPassword(actual, nueva, codigo).subscribe({
      next: () => {
        this.formClave.reset();
        this.destinoCodigo.set(null);
        this.espera.set(0);
        this.exito.set('Tu contraseña fue cambiada.');
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
