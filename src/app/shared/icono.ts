import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Íconos del proyecto: todos son de Angular Material (Material Symbols Outlined).
 * Se usan siempre con <cv-icono nombre="..."> para que el formato sea el mismo en toda la app.
 */
export const ICONOS = {
  inicio: 'home',
  comunidades: 'groups',
  libro: 'menu_book',
  biblioteca: 'local_library',
  archivo: 'description',
  campana: 'notifications',
  megafono: 'campaign',
  mensaje: 'chat',
  birrete: 'school',
  bandeja: 'inbox',
  grafico: 'bar_chart',
  usuario: 'person',
  salir: 'logout',
  menu: 'menu',
  check: 'check',
  cerrar: 'close',
  reloj: 'schedule',
  lapiz: 'edit',
  basura: 'delete',
  clip: 'attach_file',
  candado: 'lock',
  desbloquear: 'lock_open',
  llave: 'key',
  camara: 'photo_camera',
  calendario: 'calendar_month',
  video: 'videocam',
  enlace: 'link',
  buscar: 'search',
  correo: 'mail',
  alerta: 'warning',
  ajustes: 'tune',
  escudo: 'shield',
  estrella: 'star',
  trofeo: 'emoji_events',
  globo: 'public',
  escuela: 'account_balance',
  brillo: 'auto_awesome',
  mochila: 'backpack',
  pin: 'push_pin',
  tendencia: 'trending_up',
  brujula: 'explore',
  calculadora: 'calculate',
  prohibido: 'block',
  computadora: 'computer',
  externo: 'open_in_new',
  atras: 'arrow_back',
  adelante: 'arrow_forward',
  deshacer: 'undo',
  mas: 'add',
  ojo: 'visibility',
  recargar: 'refresh',
  subir: 'upload',
  descargar: 'download',
  etiqueta: 'sell',
  idioma: 'translate',
  ubicacion: 'location_on',
  portapapeles: 'content_paste',
  lista: 'list',
  info: 'info',
} satisfies Record<string, string>;

export type NombreIcono = keyof typeof ICONOS;

@Component({
  selector: 'cv-icono',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<mat-icon fontSet="material-symbols-outlined" [style.font-size.px]="tamano()" [style.width.px]="tamano()" [style.height.px]="tamano()">{{ simbolo() }}</mat-icon>`,
  styles: `
    :host { display: inline-flex; align-items: center; justify-content: center; vertical-align: -0.2em; line-height: 1; flex-shrink: 0; }
    mat-icon { line-height: 1; overflow: visible; }
  `,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(18);
  protected readonly simbolo = computed(() => ICONOS[this.nombre()]);
}
