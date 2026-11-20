import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const c = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const l = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}`;
const p = (...pts: number[]) => 'M' + pts.join(' ');
const r = (x: number, y: number, w: number, h: number, rx: number) =>
  `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${rx} 0 0 1 ${rx} ${rx}v${h - 2 * rx}a${rx} ${rx} 0 0 1 ${-rx} ${rx}h${-(w - 2 * rx)}a${rx} ${rx} 0 0 1 ${-rx} ${-rx}v${-(h - 2 * rx)}a${rx} ${rx} 0 0 1 ${rx} ${-rx}z`;

export const ICONOS = {
  inicio: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', p(9, 22, 9, 12, 15, 12, 15, 22)],
  comunidades: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', c(9, 7, 4), 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  libro: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  biblioteca: ['m16 6 4 14', 'M12 6v14', 'M8 8v12', 'M4 4v16'],
  archivo: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', p(14, 2, 14, 8, 20, 8), l(16, 13, 8, 13), l(16, 17, 8, 17)],
  campana: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  megafono: ['m3 11 18-5v12L3 14v-3z', 'M11.6 16.8a3 3 0 1 1-5.8-1.6'],
  mensaje: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  birrete: ['M22 10v6M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5'],
  bandeja: [p(22, 12, 16, 12, 14, 15, 10, 15, 8, 12, 2, 12), 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
  grafico: [l(12, 20, 12, 10), l(18, 20, 18, 4), l(6, 20, 6, 16)],
  usuario: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', c(12, 7, 4)],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', p(16, 17, 21, 12, 16, 7), l(21, 12, 9, 12)],
  menu: [l(4, 6, 20, 6), l(4, 12, 20, 12), l(4, 18, 20, 18)],
  check: [p(20, 6, 9, 17, 4, 12)],
  cerrar: ['M18 6 6 18', 'm6 6 12 12'],
  reloj: [c(12, 12, 10), p(12, 6, 12, 12, 16, 14)],
  lapiz: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'],
  basura: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'],
  clip: ['m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'],
  candado: [r(3, 11, 18, 11, 2), 'M7 11V7a5 5 0 0 1 10 0v4'],
  desbloquear: [r(3, 11, 18, 11, 2), 'M7 11V7a5 5 0 0 1 9.9-1'],
  llave: [c(7.5, 15.5, 5.5), 'm21 2-9.6 9.6', 'm15.5 7.5 3 3L22 7l-3-3'],
  camara: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', c(12, 13, 3)],
  calendario: [r(3, 4, 18, 18, 2), l(16, 2, 16, 6), l(8, 2, 8, 6), l(3, 10, 21, 10)],
  video: ['m22 8-6 4 6 4V8Z', r(2, 6, 14, 12, 2)],
  enlace: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  buscar: [c(11, 11, 8), 'm21 21-4.3-4.3'],
  correo: [r(2, 4, 20, 16, 2), 'm22 7-10 6L2 7'],
  alerta: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', 'M12 9v4', 'M12 17h.01'],
  ajustes: [l(4, 21, 4, 14), l(4, 10, 4, 3), l(12, 21, 12, 12), l(12, 8, 12, 3), l(20, 21, 20, 16), l(20, 12, 20, 3), l(1, 14, 7, 14), l(9, 8, 15, 8), l(17, 16, 23, 16)],
  escudo: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'],
  estrella: [p(12, 2, 15.09, 8.26, 22, 9.27, 17, 14.14, 18.18, 21.02, 12, 17.77, 5.82, 21.02, 7, 14.14, 2, 9.27, 8.91, 8.26) + 'z'],
  trofeo: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  globo: [c(12, 12, 10), l(2, 12, 22, 12), 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  escuela: ['M3 21h18', 'M5 21V8l7-5 7 5v13', 'M9 21v-6h6v6'],
  brillo: ['M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z', 'M19 17v4', 'M17 19h4'],
  mochila: ['M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2', 'M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5'],
  pin: ['M12 17v5', 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'],
  tendencia: [p(22, 7, 13.5, 15.5, 8.5, 10.5, 2, 17), p(16, 7, 22, 7, 22, 13)],
  brujula: [c(12, 12, 10), p(16.24, 7.76, 14.12, 14.12, 7.76, 16.24, 9.88, 9.88) + 'z'],
  calculadora: [r(4, 2, 16, 20, 2), l(8, 6, 16, 6), l(8, 14, 8, 14.01), l(12, 14, 12, 14.01), l(16, 14, 16, 14.01), l(8, 18, 8, 18.01), l(12, 18, 12, 18.01), l(16, 18, 16, 18.01)],
  prohibido: [c(12, 12, 10), 'm4.9 4.9 14.2 14.2'],
  computadora: [r(3, 4, 18, 12, 2), l(2, 20, 22, 20)],
  externo: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  atras: ['m12 19-7-7 7-7', 'M19 12H5'],
  adelante: ['M5 12h14', 'm12 5 7 7-7 7'],
  deshacer: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  mas: ['M5 12h14', 'M12 5v14'],
  ojo: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', c(12, 12, 3)],
  recargar: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
  subir: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', p(17, 8, 12, 3, 7, 8), l(12, 3, 12, 15)],
  descargar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', p(7, 10, 12, 15, 17, 10), l(12, 15, 12, 3)],
  etiqueta: ['M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41z', c(7, 7, 1.5)],
  idioma: ['m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'],
  ubicacion: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', c(12, 10, 3)],
  portapapeles: [r(8, 2, 8, 4, 1), 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'],
  lista: [l(8, 6, 21, 6), l(8, 12, 21, 12), l(8, 18, 21, 18), l(3, 6, 3.01, 6), l(3, 12, 3.01, 12), l(3, 18, 3.01, 18)],
  info: [c(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
} satisfies Record<string, string[]>;

export type NombreIcono = keyof typeof ICONOS;

@Component({
  selector: 'cv-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [attr.width]="tamano()" [attr.height]="tamano()">
    @for (d of trazos(); track $index) { <path [attr.d]="d" /> }
  </svg>`,
  styles: `:host { display: inline-flex; align-items: center; justify-content: center; vertical-align: -0.2em; line-height: 1; flex-shrink: 0; }`,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(18);
  protected readonly trazos = computed(() => ICONOS[this.nombre()]);
}
