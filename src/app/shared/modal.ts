import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'cv-modal',
  template: `
    <div class="modal-fondo" (click)="cerrar.emit()">
      <div class="modal" [class.ancho]="ancho()" role="dialog" aria-modal="true" [attr.aria-label]="titulo()" (click)="$event.stopPropagation()">
        <div class="modal-cabeza">
          <h3>{{ titulo() }}</h3>
          <button class="modal-x" type="button" aria-label="Cerrar" (click)="cerrar.emit()">×</button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
  styles: `.modal.ancho { max-width: 680px; }`,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly ancho = input(false);
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  protected escape(): void {
    this.cerrar.emit();
  }
}
