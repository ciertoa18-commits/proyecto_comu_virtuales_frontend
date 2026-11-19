import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CuentaApi } from '../../core/api/cuenta.api';
import { PATRON_CORREO } from '../../core/modelos';
import { errorCampo, textoError } from '../../core/util/errores';
import { mismasClaves } from './registro';

@Component({
  selector: 'cv-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.html',
})
export class Recuperar {
  private readonly cuenta = inject(CuentaApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly paso = signal<1 | 2>(1);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorCampo = errorCampo;

  protected readonly msgCorreo = 'Escribe tu correo institucional (@perueduca.pe o @minedu.gob.pe).';
  protected readonly formCorreo = this.fb.nonNullable.group({ correo: ['', [Validators.required, Validators.pattern(PATRON_CORREO)]] });
  protected readonly formClave = this.fb.nonNullable.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: mismasClaves('nueva', 'confirmar') },
  );

  protected get correo(): string {
    return this.formCorreo.getRawValue().correo.trim().toLowerCase();
  }

  protected pedir(): void {
    this.error.set(null);
    if (this.formCorreo.invalid) {
      this.formCorreo.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.cuenta.pedirCodigo(this.correo).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.info.set(r.mensaje);
        this.paso.set(2);
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected cambiar(): void {
    this.error.set(null);
    if (this.formClave.invalid) {
      this.formClave.markAllAsTouched();
      return;
    }
    const { codigo, nueva } = this.formClave.getRawValue();
    this.enviando.set(true);
    this.cuenta.restablecer(this.correo, codigo, nueva).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { motivo: 'restablecida' } }),
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected otroCodigo(): void {
    this.paso.set(1);
    this.info.set(null);
    this.error.set(null);
    this.formClave.reset();
  }
}
