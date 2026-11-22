import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, defer, EMPTY, finalize, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DatosAviso, Mensaje, Notificacion, Pagina, Persona, UsuarioResumen } from '../modelos';
import { params } from './parametros';

@Injectable({ providedIn: 'root' })
export class ComunicacionApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  readonly sinLeer = signal(0);
  /** Cambios de notificaciones aún sin respuesta: mientras haya, la campana no toma recuentos viejos. */
  private pendientes = 0;

  notificaciones(page = 0, size = 15) {
    return this.http.get<Pagina<Notificacion>>(`${this.url}/me/notificaciones`, { params: { page, size } });
  }
  contarSinLeer() {
    return this.http.get<{ total: number }>(`${this.url}/me/notificaciones/no-leidas`).pipe(
      tap((r) => {
        if (this.pendientes === 0) this.sinLeer.set(r.total);
      }),
      catchError(() => EMPTY),
    );
  }
  /** Al terminar el último cambio pendiente, se pide un solo recuento al servidor. */
  private cambio(peticion: Observable<void>): Observable<void> {
    return defer(() => {
      this.pendientes++;
      return peticion.pipe(
        finalize(() => {
          this.pendientes--;
          if (this.pendientes === 0) this.contarSinLeer().subscribe();
        }),
      );
    });
  }
  marcarLeida(id: number) {
    return this.cambio(this.http.put<void>(`${this.url}/notificaciones/${id}/leida`, null));
  }
  marcarNoLeida(id: number) {
    return this.cambio(this.http.delete<void>(`${this.url}/notificaciones/${id}/leida`));
  }
  eliminarNotificacion(id: number) {
    return this.cambio(this.http.delete<void>(`${this.url}/notificaciones/${id}`));
  }
  marcarTodas() {
    return this.cambio(this.http.put<void>(`${this.url}/me/notificaciones/leidas`, null));
  }
  enviarAviso(d: DatosAviso) {
    return this.http.post<{ enviadas: number; mensaje: string }>(`${this.url}/notificaciones`, d);
  }
  buscarPersonas(q: string) {
    return this.http.get<UsuarioResumen[]>(`${this.url}/usuarios/buscar`, { params: { q } });
  }

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
