import { Component, inject, input, signal } from '@angular/core';
import { CatalogoApi } from '../core/api/catalogo.api';

/** Descarga un archivo del backend con su nombre original. */
@Component({
  selector: 'cv-descarga',
  template: `
    <button class="btn btn-chico btn-azul-borde" type="button" [disabled]="bajando()" (click)="bajar()">
      {{ bajando() ? 'Descargando...' : '⬇ ' + texto() }}
    </button>
  `,
})
export class BotonDescarga {
  private readonly api = inject(CatalogoApi);
  readonly idArchivo = input.required<number>();
  readonly texto = input('Descargar');
  protected readonly bajando = signal(false);

  protected bajar(): void {
    this.bajando.set(true);
    this.api.datosArchivo(this.idArchivo()).subscribe({
      next: (info) =>
        this.api.descargar(this.idArchivo()).subscribe({
          next: (blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = info.nombreOriginal;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            this.bajando.set(false);
          },
          error: () => this.bajando.set(false),
        }),
      error: () => this.bajando.set(false),
    });
  }
}
