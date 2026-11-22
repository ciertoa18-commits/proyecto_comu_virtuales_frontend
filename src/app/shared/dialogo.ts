import { Component, HostListener, inject, Injectable, signal } from '@angular/core';
import { Icono } from './icono';

export interface OpcionesDialogo {
  titulo?: string;
  aceptar?: string;
  peligro?: boolean;
}

interface Pedido extends Required<OpcionesDialogo> {
  mensaje: string;
  responder: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogoService {
  readonly actual = signal<Pedido | null>(null);

  confirmar(mensaje: string, opciones: OpcionesDialogo = {}): Promise<boolean> {
    this.actual()?.responder(false);
    return new Promise((resolver) =>
      this.actual.set({
        mensaje,
        titulo: opciones.titulo ?? 'Confirmar',
        aceptar: opciones.aceptar ?? 'Aceptar',
        peligro: opciones.peligro ?? false,
        responder: (ok) => {
          this.actual.set(null);
          resolver(ok);
        },
      }),
    );
  }
}

@Component({
  selector: 'cv-dialogo',
  imports: [Icono],
  template: `
    @if (servicio.actual(); as d) {
      <div class="modal-fondo" (click)="d.responder(false)">
        <div class="modal dialogo" role="alertdialog" aria-modal="true" [attr.aria-label]="d.titulo" (click)="$event.stopPropagation()">
          <div class="cabeza">
            <span class="ico" [class.peligro]="d.peligro"><cv-icono [nombre]="d.peligro ? 'alerta' : 'info'" [tamano]="22" /></span>
            <h3>{{ d.titulo }}</h3>
          </div>
          <p>{{ d.mensaje }}</p>
          <div class="botones">
            <button class="btn" type="button" (click)="d.responder(false)">Cancelar</button>
            <button class="btn" [class.btn-peligro-lleno]="d.peligro" [class.btn-primario]="!d.peligro" type="button" (click)="d.responder(true)">{{ d.aceptar }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .dialogo { max-width: 420px; }
    .cabeza { display: flex; align-items: center; gap: .7rem; margin-bottom: .4rem; }
    .cabeza h3 { margin: 0; font-size: 1.15rem; font-weight: 800; }
    .ico { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #eaf1fb; color: #2f5d9a; flex: none; }
    .ico.peligro { background: var(--rojo-claro); color: var(--rojo); }
    p { color: #444; margin: .4rem 0 1.2rem; line-height: 1.45; }
    .botones { display: flex; justify-content: flex-end; gap: .5rem; }
    .btn-peligro-lleno { background: #c0392b; border-color: #c0392b; color: #fff; }
    .btn-peligro-lleno:hover { background: #a93226; }
  `,
})
export class Dialogo {
  protected readonly servicio = inject(DialogoService);

  @HostListener('document:keydown.escape')
  protected escape(): void {
    this.servicio.actual()?.responder(false);
  }
}
