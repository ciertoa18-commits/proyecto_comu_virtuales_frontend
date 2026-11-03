import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PATRON_CORREO } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, textoError } from '../../core/util/errores';

/** CU01 · Iniciar sesión. */
@Component({
  selector: 'cv-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /** Parámetros de la URL: ?motivo=salio|vencio|restablecida &volver=/ruta */
  readonly motivo = input<string>();
  readonly volver = input<string>();

  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly msgCorreo = 'Usa tu correo institucional (@perueduca.pe o @minedu.gob.pe).';

  protected readonly form = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.pattern(PATRON_CORREO)]],
    password: ['', Validators.required],
  });

  protected err(c: 'correo' | 'password'): string | null {
    return errorCampo(this.form.controls[c], this.msgCorreo);
  }

  protected entrar(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { correo, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.sesion.ingresar(correo.trim().toLowerCase(), password).subscribe({
      next: () => {
        const v = this.volver();
        void this.router.navigateByUrl(v && v.startsWith('/') && !v.startsWith('//') ? v : '/inicio');
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
