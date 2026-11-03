import { Component, input, output } from '@angular/core';

/** Anterior / Siguiente para las listas paginadas (la página empieza en 0). */
@Component({
  selector: 'cv-paginador',
  template: `
    @if (total() > 1) {
      <nav class="paginador" aria-label="Paginación">
        <button class="btn btn-chico" type="button" [disabled]="pagina() === 0" (click)="ir.emit(pagina() - 1)">← Anterior</button>
        <span>Página {{ pagina() + 1 }} de {{ total() }}</span>
        <button class="btn btn-chico" type="button" [disabled]="pagina() + 1 >= total()" (click)="ir.emit(pagina() + 1)">Siguiente →</button>
      </nav>
    }
  `,
})
export class Paginador {
  readonly pagina = input.required<number>();
  readonly total = input.required<number>();
  readonly ir = output<number>();
}
