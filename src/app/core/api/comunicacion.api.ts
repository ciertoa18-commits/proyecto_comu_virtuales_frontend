import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DatosAviso, Mensaje, Notificacion, Pagina, Persona, UsuarioResumen } from '../modelos';
import { params } from './parametros';


@Injectable({ providedIn: 'root' })
export class ComunicacionApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;


  readonly sinLeer = signal(0);

  notificaciones(page = 0, size = 15) {
    return this.http
      .get<Pagina<Notificacion>>(`${this.url}/me/notificaciones`, { params: { page, size } })
      .pipe(tap((p) => page === 0 && size >= 15 && this.sinLeer.set(p.content.filter((n) => !n.leida).length)));
  }
  marcarLeida(id: number) {
    return this.http.put<void>(`${this.url}/notificaciones/${id}/leida`, null).pipe(tap(() => this.sinLeer.update((n) => Math.max(0, n - 1))));
  }
  marcarTodas() {
    return this.http.put<void>(`${this.url}/me/notificaciones/leidas`, null).pipe(tap(() => this.sinLeer.set(0)));
  }
  enviarAviso(d: DatosAviso) {
    return this.http.post<{ enviadas: number; mensaje: string }>(`${this.url}/notificaciones`, d);
  }
  buscarPersonas(q: string) {
    return this.http.get<UsuarioResumen[]>(`${this.url}/usuarios/buscar`, { params: { q } });
  }

  /** Personas con las que comparto alguna comunidad (a quienes puedo escribir). */
  contactos() {
    return this.http.get<Persona[]>(`${this.url}/me/contactos`);
  }

  mensajes(con?: number | null) {
    return this.http.get<Pagina<Mensaje>>(`${this.url}/me/mensajes`, { params: params({ con, page: 0, size: 100 }) });
  }
  enviarMensaje(idReceptor: number, contenido: string) {
    return this.http.post<Mensaje>(`${this.url}/mensajes`, { idReceptor, contenido });
  }
  marcarMensajeLeido(id: number) {
    return this.http.put<void>(`${this.url}/mensajes/${id}/leido`, null);
  }
}
