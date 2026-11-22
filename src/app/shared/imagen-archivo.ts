import { Component, effect, inject, input, OnDestroy, signal } from '@angular/core';
import { CatalogoApi } from '../core/api/catalogo.api';

@Component({
  selector: 'cv-imagen',
  template: `
    @if (src(); as s) {
      <img [src]="s" [alt]="alt()" [style.width]="ancho()" [style.height]="alto()" [class.redonda]="redonda()" loading="lazy" />
    } @else {
      <div class="hueco" [style.width]="ancho()" [style.height]="alto()" [class.redonda]="redonda()"></div>
    }
  `,
  styles: `
    img, .hueco { display: block; object-fit: cover; border-radius: 10px; max-width: 100%; }
    .hueco { background: var(--superficie-2); }
    .redonda { border-radius: 50%; }
  `,
})
export class ImagenArchivo implements OnDestroy {
  private readonly api = inject(CatalogoApi);
  readonly idArchivo = input.required<number>();
  readonly alt = input('');
  readonly ancho = input('100%');
  readonly alto = input('140px');
  readonly redonda = input(false);
  protected readonly src = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.idArchivo();
      this.api.descargar(id).subscribe({
        next: (blob) => {
          this.liberar();
          this.src.set(URL.createObjectURL(blob));
        },
        error: () => this.src.set(null),
      });
    });
  }

  ngOnDestroy(): void {
    this.liberar();
  }

  private liberar(): void {
    const s = this.src();
    if (s) URL.revokeObjectURL(s);
  }
}
