import { effect, inject, Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { SesionService } from '../sesion/sesion.service';

export type EventoTiempoReal = 'MENSAJE' | 'NOTIFICACION';

@Injectable({ providedIn: 'root' })
export class TiempoRealService {
  private readonly sesion = inject(SesionService);
  private readonly eventos = new Subject<EventoTiempoReal>();
  private socket: WebSocket | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private espera = 2000;

  constructor() {
    effect(() => {
      const token = this.sesion.token();
      this.cerrar();
      if (token) this.abrir(token);
    });
  }

  de(tipo: EventoTiempoReal): Observable<void> {
    return this.eventos.pipe(
      filter((e) => e === tipo),
      map(() => undefined),
    );
  }

  private abrir(token: string): void {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocolo}://${location.host}/ws?token=${encodeURIComponent(token)}`);
    this.socket = ws;
    ws.onopen = () => (this.espera = 2000);
    ws.onmessage = (m) => {
      try {
        const tipo = JSON.parse(m.data as string).tipo as EventoTiempoReal;
        this.eventos.next(tipo);
      } catch {
        this.eventos.next('NOTIFICACION');
      }
    };
    ws.onclose = () => {
      if (this.socket !== ws || !this.sesion.token()) return;
      this.socket = null;
      this.reintento = setTimeout(() => {
        const t = this.sesion.token();
        if (t) this.abrir(t);
      }, this.espera);
      this.espera = Math.min(this.espera * 2, 30000);
    };
  }

  private cerrar(): void {
    if (this.reintento) clearTimeout(this.reintento);
    this.reintento = null;
    const ws = this.socket;
    this.socket = null;
    ws?.close();
  }
}
