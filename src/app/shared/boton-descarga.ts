import { Component, inject, input, signal } from '@angular/core';
import { CatalogoApi } from '../core/api/catalogo.api';
import { Icono } from './icono';

@Component({
  selector: 'cv-descarga',
  imports: [Icono],
  template: `
    <button class="btn btn-chico btn-azul-borde" style="display: inline-flex; align-items: center; gap: .3rem" type="button" [disabled]="bajando()" (click)="bajar()">
      @if (!bajando()) { <cv-icono nombre="descargar" [tamano]="14" /> } {{ bajando() ? 'Descargando...' : texto() }}
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
