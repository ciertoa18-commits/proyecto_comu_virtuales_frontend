import { inject, Injectable, signal } from '@angular/core';
import { CuentaApi } from '../api/cuenta.api';
import { Persona } from '../modelos';

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly api = inject(CuentaApi);
  private readonly cache = signal<Record<number, Persona>>({});
  private readonly pedidos = new Set<number>();

  nombre(id: number | null | undefined): string {
    if (!id) return '';
    const p = this.cache()[id];
    if (p) return `${p.nombres} ${p.apellidos}`;
    this.pedir(id);
    return `Usuario #${id}`;
  }

  persona(id: number): Persona | undefined {
    const p = this.cache()[id];
    if (!p) this.pedir(id);
    return p;
  }

  recordar(p: Persona): void {
    this.cache.update((c) => ({ ...c, [p.idUsuario]: p }));
  }

  private pedir(id: number): void {
    if (this.pedidos.has(id)) return;
    this.pedidos.add(id);
    this.api.persona(id).subscribe({ next: (p) => this.recordar(p), error: () => undefined });
  }
}
