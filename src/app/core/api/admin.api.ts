import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DatosNuevoUsuario, EstadoUsuario, Pagina, ReporteDocente, ReporteIdioma, Rol, UsuarioResumen } from '../modelos';
import { params } from './parametros';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}`;

  usuarios(f: { rol?: Rol | ''; estado?: EstadoUsuario | ''; q?: string; page?: number; size?: number }) {
    return this.http.get<Pagina<UsuarioResumen>>(`${this.url}/admin/usuarios`, {
      params: params({ rol: f.rol, estado: f.estado, q: f.q, page: f.page ?? 0, size: f.size ?? 15 }),
    });
  }
  crearUsuario(d: DatosNuevoUsuario) {
    return this.http.post<UsuarioResumen>(`${this.url}/admin/usuarios`, d);
  }
  aprobar(id: number) {
    return this.http.put<UsuarioResumen>(`${this.url}/admin/usuarios/${id}/aprobar`, null);
  }
  cambiarEstado(id: number, estado: EstadoUsuario) {
    return this.http.put<UsuarioResumen>(`${this.url}/admin/usuarios/${id}/estado`, { estado });
  }
  nuevaPassword(id: number, nueva: string) {
    return this.http.put<void>(`${this.url}/admin/usuarios/${id}/password`, { nueva });
  }

  reporteIdiomas() {
    return this.http.get<ReporteIdioma[]>(`${this.url}/reportes/idiomas`);
  }
  reporteDocentes(periodo?: number | null) {
    return this.http.get<ReporteDocente[]>(`${this.url}/reportes/docentes`, { params: params({ periodo }) });
  }
}
