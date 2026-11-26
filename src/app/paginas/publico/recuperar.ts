import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CuentaApi } from '../../core/api/cuenta.api';
import { errorCampo, textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { VerClave } from '../../shared/ver-clave';
import { claveSegura } from '../../core/util/clave';
import { mismasClaves } from './registro';

type Paso = 'correo' | 'codigo' | 'clave';

@Component({
  selector: 'cv-recuperar',
  imports: [ReactiveFormsModule, RouterLink, Icono, VerClave],
  templateUrl: './recuperar.html',
  styleUrl: './recuperar.css',
})
export class Recuperar {
  private readonly cuenta = inject(CuentaApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly paso = signal<Paso>('correo');
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly codigoDemo = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorCampo = errorCampo;

  protected readonly msgCorreo = 'Escribe un correo válido, por ejemplo tucorreo@gmail.com.';
  protected readonly formCorreo = this.fb.nonNullable.group({ correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]] });
  protected readonly formCodigo = this.fb.nonNullable.group({ codigo: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]] });
  protected readonly formClave = this.fb.nonNullable.group(
    {
      nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72), claveSegura]],
      confirmar: ['', Validators.required],
    },
    { validators: mismasClaves('nueva', 'confirmar') },
  );

  protected get correo(): string {
    return this.formCorreo.getRawValue().correo.trim().toLowerCase();
  }

  private get codigo(): string {
    return this.formCodigo.getRawValue().codigo.trim();
  }

  protected pedir(): void {
    this.error.set(null);
    if (this.formCorreo.invalid) return this.formCorreo.markAllAsTouched();
    this.enviando.set(true);
    this.cuenta.pedirCodigo(this.correo).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.info.set(r.mensaje);
        this.codigoDemo.set(r.codigoDemo ?? null);
        this.formCodigo.reset();
        this.paso.set('codigo');
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected verificar(): void {
    this.error.set(null);
    if (this.formCodigo.invalid) return this.formCodigo.markAllAsTouched();
    this.enviando.set(true);
    this.cuenta.verificarCodigo(this.correo, this.codigo).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.info.set(r.mensaje);
        this.codigoDemo.set(null);
        this.formClave.reset();
        this.paso.set('clave');
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected cambiar(): void {
    this.error.set(null);
    if (this.formClave.invalid) return this.formClave.markAllAsTouched();
    this.enviando.set(true);
    this.cuenta.restablecer(this.correo, this.codigo, this.formClave.getRawValue().nueva).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { motivo: 'restablecida' } }),
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected otroCodigo(): void {
    this.paso.set('correo');
    this.info.set(null);
    this.error.set(null);
    this.codigoDemo.set(null);
    this.formCodigo.reset();
    this.formClave.reset();
  }
}
