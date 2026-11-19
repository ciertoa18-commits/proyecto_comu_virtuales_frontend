import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { CuentaApi } from '../../core/api/cuenta.api';
import { NOMBRE_ROL, PATRON_TELEFONO, Usuario } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { iniciales, LIMITE_FOTO } from '../../core/util/texto';
import { ImagenArchivo } from '../../shared/imagen-archivo';
import { mismasClaves } from '../publico/registro';

@Component({
  selector: 'cv-perfil',
  imports: [ReactiveFormsModule, AsyncPipe, DatePipe, ImagenArchivo],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private readonly cuenta = inject(CuentaApi);
  private readonly sesion = inject(SesionService);
  private readonly fb = inject(FormBuilder);
  protected readonly idiomas$ = inject(CatalogoApi).idiomas$;

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly pestana = signal<'datos' | 'seguridad'>('datos');
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly subiendo = signal(false);
  protected readonly msgTelefono = 'Debe tener 9 dígitos.';
  protected readonly errorCampo = errorCampo;

  protected readonly iniciales = computed(() => iniciales(this.usuario() ? `${this.usuario()!.nombres} ${this.usuario()!.apellidos}` : ''));
  protected readonly rol = computed(() => NOMBRE_ROL[this.sesion.rol() ?? 'ESTUDIANTE'].toUpperCase());
  protected readonly esDocente = computed(() => this.sesion.rol() === 'DOCENTE');

  protected readonly formDatos = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    especialidad: [null as string | null, Validators.maxLength(100)],
    telefono: [null as string | null, Validators.pattern(PATRON_TELEFONO)],
    correoRecuperacion: [null as string | null, [Validators.email, Validators.maxLength(150)]],
    idIdiomaPref: [null as number | null],
  });
  protected readonly formClave = this.fb.nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: mismasClaves('nueva', 'confirmar') },
  );

  ngOnInit(): void {
    this.cuenta.yo().subscribe({
      next: ({ usuario }) => {
        this.usuario.set(usuario);
        this.formDatos.patchValue(usuario);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  private limpiar(): void {
    this.error.set(null);
    this.exito.set(null);
    this.delServidor.set({});
  }

  protected guardar(): void {
    this.limpiar();
    if (this.formDatos.invalid) return this.formDatos.markAllAsTouched();
    const v = this.formDatos.getRawValue();
    this.cuenta
      .guardarPerfil({
        nombres: v.nombres!.trim(),
        apellidos: v.apellidos!.trim(),
        especialidad: v.especialidad?.trim() || null,
        telefono: v.telefono?.trim() || null,
        correoRecuperacion: v.correoRecuperacion?.trim().toLowerCase() || null,
        idIdiomaPref: v.idIdiomaPref,
      })
      .subscribe({
        next: (u) => {
          this.usuario.set(u);
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

  protected cambiarClave(): void {
    this.limpiar();
    if (this.formClave.invalid) return this.formClave.markAllAsTouched();
    const { actual, nueva } = this.formClave.getRawValue();
    this.cuenta.cambiarPassword(actual, nueva).subscribe({
      next: () => {
        this.formClave.reset();
        this.exito.set('Tu contraseña fue cambiada.');
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
