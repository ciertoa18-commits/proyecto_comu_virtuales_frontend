import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  Comentario, Comunidad, ComunidadImportada, DatosComunidad, Evento, MiComunidad, Miembro, Pagina, Publicacion, ResultadoImportacion, Solicitud,
  VistaComentario, VistaPublicacion,
} from '../modelos';
import { params } from './parametros';

@Injectable({ providedIn: 'root' })
export class ComunidadApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  listar(f: { q?: string; categoria?: number | null; idioma?: number | null; page?: number; size?: number }) {
    return this.http.get<Pagina<Comunidad>>(`${this.url}/comunidades`, {
      params: params({ q: f.q, categoria: f.categoria, idioma: f.idioma, page: f.page ?? 0, size: f.size ?? 12 }),
    });
  }
  importar(filas: ComunidadImportada[]) {
    return this.http.post<ResultadoImportacion[]>(`${this.url}/comunidades/importar`, { filas });
  }
  recomendadas() {
    return this.http.get<Pagina<Comunidad>>(`${this.url}/comunidades/recomendadas`);
  }
  mias() {
    return this.http.get<MiComunidad[]>(`${this.url}/me/comunidades`);
  }
  segundasLenguas(id: number) {
    return this.http.get<number[]>(`${this.url}/comunidades/${id}/segundas-lenguas`);
  }
  obtener(id: number) {
    return this.http.get<Comunidad>(`${this.url}/comunidades/${id}`);
  }
  crear(d: DatosComunidad) {
    return this.http.post<Comunidad>(`${this.url}/comunidades`, d);
  }
  editar(id: number, d: DatosComunidad) {
    return this.http.put<Comunidad>(`${this.url}/comunidades/${id}`, d);
  }
  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/comunidades/${id}`);
  }

  unirse(id: number) {
    return this.http.post<unknown>(`${this.url}/comunidades/${id}/unirse`, null);
  }
  solicitarIngreso(id: number, mensaje: string | null) {
    return this.http.post<Solicitud>(`${this.url}/comunidades/${id}/solicitudes`, { mensaje });
  }
  salir(id: number) {
    return this.http.delete<void>(`${this.url}/comunidades/${id}/miembros/me`);
  }
  miembros(id: number) {
    return this.http.get<Miembro[]>(`${this.url}/comunidades/${id}/miembros`);
  }
  expulsar(id: number, idUsuario: number) {
    return this.http.delete<void>(`${this.url}/comunidades/${id}/miembros/${idUsuario}`);
  }

  solicitudes(estado: string, page = 0, q = '', size = 10) {
    return this.http.get<Pagina<Solicitud>>(`${this.url}/solicitudes`, { params: params({ estado, page, size, q }) });
  }
  resolver(id: number, aprobar: boolean, motivo: string | null) {
    return this.http.put<Solicitud>(`${this.url}/solicitudes/${id}`, { aprobar, motivo });
  }

  muro(id: number, page = 0) {
    return this.http.get<Pagina<VistaPublicacion>>(`${this.url}/comunidades/${id}/publicaciones`, { params: { page, size: 10 } });
  }
  pendientes(id: number) {
    return this.http.get<Pagina<VistaPublicacion>>(`${this.url}/comunidades/${id}/publicaciones/pendientes`);
  }
  publicacion(id: number) {
    return this.http.get<VistaPublicacion>(`${this.url}/publicaciones/${id}`);
  }
  publicar(idComunidad: number, d: { titulo: string | null; contenido: string | null; archivos: number[] }) {
    return this.http.post<Publicacion>(`${this.url}/comunidades/${idComunidad}/publicaciones`, d);
  }
  editarPublicacion(id: number, d: { titulo: string | null; contenido: string | null; archivos: number[] }) {
    return this.http.put<Publicacion>(`${this.url}/publicaciones/${id}`, d);
  }
  eliminarPublicacion(id: number) {
    return this.http.delete<void>(`${this.url}/publicaciones/${id}`);
  }
  moderar(id: number, estado: 'APROBADA' | 'RECHAZADA') {
    return this.http.put<Publicacion>(`${this.url}/publicaciones/${id}/moderacion`, { estado });
  }
  comentarios(id: number) {
    return this.http.get<Pagina<VistaComentario>>(`${this.url}/publicaciones/${id}/comentarios`, { params: { size: 100 } });
  }
  comentar(id: number, contenido: string, idComentarioPadre: number | null) {
    return this.http.post<Comentario>(`${this.url}/publicaciones/${id}/comentarios`, { contenido, idComentarioPadre });
  }
  eliminarComentario(id: number) {
    return this.http.delete<void>(`${this.url}/comentarios/${id}`);
  }

  eventos(id: number) {
    return this.http.get<Evento[]>(`${this.url}/comunidades/${id}/eventos`);
  }
  crearEvento(id: number, d: { titulo: string; descripcion: string | null; fechaInicio: string; fechaFin: string | null; enlace: string | null; idSeccion: number | null }) {
    return this.http.post<Evento>(`${this.url}/comunidades/${id}/eventos`, d);
  }
}
