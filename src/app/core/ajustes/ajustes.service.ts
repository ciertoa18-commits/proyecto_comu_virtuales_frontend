import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro' | 'sistema';
export type Acento = 'gris' | 'azul' | 'verde' | 'morado';
export type Letra = 'normal' | 'grande' | 'muy-grande';

export interface Preferencias {
  tema: Tema;
  acento: Acento;
  letra: Letra;
  reducirAnimaciones: boolean;
  altoContraste: boolean;
  menuAbiertoAlEntrar: boolean;
}

export const PREFERENCIAS_INICIALES: Preferencias = {
  tema: 'claro',
  acento: 'gris',
  letra: 'normal',
  reducirAnimaciones: false,
  altoContraste: false,
  menuAbiertoAlEntrar: true,
};

/** Clave en el navegador; index.html la lee antes de que cargue Angular para evitar parpadeos. */
const CLAVE = 'cv-ajustes';

/** Preferencias de apariencia de este navegador (tema claro/oscuro, letra, etc.). */
@Injectable({ providedIn: 'root' })
export class AjustesService {
  private readonly oscuroDelSistema = window.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly sistemaOscuro = signal(this.oscuroDelSistema?.matches ?? false);
  readonly preferencias = signal<Preferencias>(this.leer());

  constructor() {
    this.oscuroDelSistema?.addEventListener?.('change', (e) => this.sistemaOscuro.set(e.matches));
    effect(() => this.aplicar(this.preferencias(), this.sistemaOscuro()));
  }

  cambiar<K extends keyof Preferencias>(clave: K, valor: Preferencias[K]): void {
    this.preferencias.update((p) => ({ ...p, [clave]: valor }));
    this.guardar();
  }

  restablecer(): void {
    this.preferencias.set({ ...PREFERENCIAS_INICIALES });
    this.guardar();
  }

  private aplicar(p: Preferencias, sistemaOscuro: boolean): void {
    const raiz = document.documentElement;
    const oscuro = p.tema === 'oscuro' || (p.tema === 'sistema' && sistemaOscuro);
    poner(raiz, 'tema', oscuro ? 'oscuro' : null);
    poner(raiz, 'acento', p.acento === 'gris' ? null : p.acento);
    poner(raiz, 'letra', p.letra === 'normal' ? null : p.letra);
    poner(raiz, 'movimiento', p.reducirAnimaciones ? 'reducido' : null);
    poner(raiz, 'contraste', p.altoContraste ? 'alto' : null);
  }

  private leer(): Preferencias {
    try {
      const crudo = localStorage.getItem(CLAVE);
      return crudo ? { ...PREFERENCIAS_INICIALES, ...JSON.parse(crudo) } : { ...PREFERENCIAS_INICIALES };
    } catch {
      return { ...PREFERENCIAS_INICIALES };
    }
  }

  private guardar(): void {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.preferencias()));
    } catch {
      /* navegador sin almacenamiento: se aplica solo en esta visita */
    }
  }
}

function poner(el: HTMLElement, nombre: string, valor: string | null): void {
  if (valor) el.setAttribute('data-' + nombre, valor);
  else el.removeAttribute('data-' + nombre);
}
