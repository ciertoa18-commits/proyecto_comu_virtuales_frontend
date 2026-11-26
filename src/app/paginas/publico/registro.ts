import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { CuentaApi } from '../../core/api/cuenta.api';
import { dominioCorreo, mensajeCorreo, PATRON_TELEFONO, patronCorreo, RespuestaCuenta } from '../../core/modelos';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { VerClave } from '../../shared/ver-clave';
import { claveSegura } from '../../core/util/clave';

export function mismasClaves(a: string, b: string) {
  return (g: AbstractControl): ValidationErrors | null => {
    const x = g.get(a)?.value;
    const y = g.get(b)?.value;
    return x && y && x !== y ? { distintas: true } : null;
  };
}

export const OTRO_IDIOMA = -1;

@Component({
  selector: 'cv-registro',
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe, Icono, VerClave],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private readonly cuenta = inject(CuentaApi);
  protected readonly idiomas$ = inject(CatalogoApi).idiomas$;

  protected readonly error = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly enviando = signal(false);
  protected readonly listo = signal<RespuestaCuenta | null>(null);
  protected msgCorreo = mensajeCorreo('ESTUDIANTE');
  protected dominio = dominioCorreo('ESTUDIANTE');
  protected readonly msgTelefono = 'Debe tener 9 dígitos.';

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      rol: ['ESTUDIANTE' as 'ESTUDIANTE' | 'DOCENTE'],
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.pattern(patronCorreo('ESTUDIANTE'))]],
      telefono: ['', Validators.pattern(PATRON_TELEFONO)],
      correoRecuperacion: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      especialidad: ['', Validators.maxLength(100)],
      idIdiomaPref: [1 as number | null],
      idiomaOtro: ['', Validators.maxLength(60)],
      idSegundaLengua: [null as number | null],
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72), claveSegura]],
      confirmar: ['', Validators.required],
    },
    { validators: mismasClaves('password', 'confirmar') },
  );

  protected readonly otroIdioma = OTRO_IDIOMA;

  protected get esOtroIdioma(): boolean {
    return this.form.controls.idIdiomaPref.value === OTRO_IDIOMA;
  }

  protected cambiarIdioma(): void {
    const c = this.form.controls.idiomaOtro;
    c.setValidators(this.esOtroIdioma ? [Validators.required, Validators.maxLength(60)] : [Validators.maxLength(60)]);
    c.updateValueAndValidity();
  }

  protected get docente(): boolean {
    return this.form.controls.rol.value === 'DOCENTE';
  }

  protected elegir(rol: 'ESTUDIANTE' | 'DOCENTE'): void {
    this.form.controls.rol.setValue(rol);
    const esp = this.form.controls.especialidad;
    esp.setValidators(rol === 'DOCENTE' ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)]);
    esp.updateValueAndValidity();
    this.msgCorreo = mensajeCorreo(rol);
    this.dominio = dominioCorreo(rol);
    const correo = this.form.controls.correo;
    correo.setValidators([Validators.required, Validators.pattern(patronCorreo(rol))]);
    correo.updateValueAndValidity();
  }

  protected err(c: keyof typeof this.form.controls, formato?: string): string | null {
    return this.delServidor()[c] ?? errorCampo(this.form.controls[c], formato);
  }

  protected crear(): void {
    this.error.set(null);
    this.delServidor.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.cuenta
      .registrar({
        rol: v.rol,
        nombres: v.nombres.trim(),
        apellidos: v.apellidos.trim(),
        correo: v.correo.trim().toLowerCase(),
        telefono: v.telefono.trim() || null,
        correoRecuperacion: v.correoRecuperacion.trim().toLowerCase(),
        especialidad: v.rol === 'DOCENTE' ? v.especialidad.trim() || null : null,
        idIdiomaPref: v.idIdiomaPref === OTRO_IDIOMA ? null : v.idIdiomaPref,
        idiomaOtro: v.idIdiomaPref === OTRO_IDIOMA ? v.idiomaOtro.trim() : null,
        idSegundaLengua: v.idSegundaLengua,
        password: v.password,
      })
      .subscribe({
        next: (r) => this.listo.set(r),
        error: (e) => {
          this.enviando.set(false);
          this.delServidor.set(erroresPorCampo(e));
          this.error.set(textoError(e));
        },
      });
  }
}
