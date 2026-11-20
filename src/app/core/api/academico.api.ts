import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  Asistencia, Clase, Curso, DatosSilabo, Entrega, EstadoAsistencia, Evaluacion, FilaLibreta, FilaRanking, FilaRiesgo,
  Matricula, MiCurso, Nota, Recurso, ResumenCurso, Seccion, SeccionResumen, Sesion, Silabo, TipoEvaluacion, TipoRecurso, Unidad,
} from '../modelos';

export interface DatosRecurso {
  titulo: string;
  descripcion: string | null;
  tipo: TipoRecurso;
  idSesion: number | null;
  idIdioma: number | null;
  idArchivo: number | null;
  urlExterna: string | null;
  fechaEntrega: string | null;
  permiteTardias: boolean;
  idEvaluacion: number | null;
}

@Injectable({ providedIn: 'root' })
export class AcademicoApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  cursos(idComunidad: number) {
    return this.http.get<Curso[]>(`${this.url}/comunidades/${idComunidad}/cursos`);
  }
  crearCurso(idComunidad: number, d: { codigo: string; nombre: string; descripcion: string | null }) {
    return this.http.post<Curso>(`${this.url}/comunidades/${idComunidad}/cursos`, d);
  }
  editarCurso(id: number, d: { codigo: string; nombre: string; descripcion: string | null }) {
    return this.http.put<Curso>(`${this.url}/cursos/${id}`, d);
  }
  eliminarCurso(id: number) {
    return this.http.delete<void>(`${this.url}/cursos/${id}`);
  }
  curso(id: number) {
    return this.http.get<Curso>(`${this.url}/cursos/${id}`);
  }
  secciones(idCurso: number) {
    return this.http.get<Seccion[]>(`${this.url}/cursos/${idCurso}/secciones`);
  }
  crearSeccion(idCurso: number, d: { idPeriodo: number; idDocente: number; grupo: string; cupoMaximo: number | null; salaVirtual: string | null }) {
    return this.http.post<Seccion>(`${this.url}/cursos/${idCurso}/secciones`, d);
  }
  seccion(id: number) {
    return this.http.get<Seccion>(`${this.url}/secciones/${id}`);
  }
  misSecciones() {
    return this.http.get<SeccionResumen[]>(`${this.url}/me/secciones`);
  }
  cerrarSeccion(id: number) {
    return this.http.post<void>(`${this.url}/secciones/${id}/cerrar`, null);
  }

  unidades(idSeccion: number) {
    return this.http.get<Unidad[]>(`${this.url}/secciones/${idSeccion}/unidades`);
  }
  guardarUnidad(idSeccion: number, id: number | null, d: { nombre: string; descripcion: string | null; orden: number }) {
    return id
      ? this.http.put<Unidad>(`${this.url}/unidades/${id}`, d)
      : this.http.post<Unidad>(`${this.url}/secciones/${idSeccion}/unidades`, d);
  }
  eliminarUnidad(id: number) {
    return this.http.delete<void>(`${this.url}/unidades/${id}`);
  }
  sesiones(idUnidad: number) {
    return this.http.get<Sesion[]>(`${this.url}/unidades/${idUnidad}/sesiones`);
  }
  guardarSesion(idUnidad: number, id: number | null, d: { titulo: string; orden: number; fechaInicio: string | null; duracionMin: number | null; enlaceClase: string | null }) {
    return id
      ? this.http.put<Sesion>(`${this.url}/sesiones/${id}`, d)
      : this.http.post<Sesion>(`${this.url}/unidades/${idUnidad}/sesiones`, d);
  }
  recursos(idUnidad: number) {
    return this.http.get<Recurso[]>(`${this.url}/unidades/${idUnidad}/recursos`);
  }
  guardarRecurso(idUnidad: number, id: number | null, d: DatosRecurso) {
    return id
      ? this.http.put<Recurso>(`${this.url}/recursos/${id}`, d)
      : this.http.post<Recurso>(`${this.url}/unidades/${idUnidad}/recursos`, d);
  }
  eliminarRecurso(id: number) {
    return this.http.delete<void>(`${this.url}/recursos/${id}`);
  }

  misClases() {
    return this.http.get<Clase[]>(`${this.url}/me/clases`);
  }
  misRecursos(seccion?: number) {
    return this.http.get<Recurso[]>(`${this.url}/me/recursos`, { params: seccion ? { seccion } : {} });
  }
  misCursosResumen() {
    return this.http.get<ResumenCurso[]>(`${this.url}/me/cursos-resumen`);
  }
  silabo(idSeccion: number) {
    return this.http.get<Silabo | null>(`${this.url}/secciones/${idSeccion}/silabo`);
  }
  guardarSilabo(idSeccion: number, d: DatosSilabo) {
    return this.http.put<Silabo>(`${this.url}/secciones/${idSeccion}/silabo`, d);
  }
  misNotas() {
    return this.http.get<MiCurso[]>(`${this.url}/me/notas`);
  }
  matricular(idSeccion: number, idUsuario?: number) {
    const q = idUsuario ? `?idUsuario=${idUsuario}` : '';
    return this.http.post<Matricula>(`${this.url}/secciones/${idSeccion}/matriculas${q}`, null);
  }
  retirar(idMatricula: number) {
    return this.http.put<void>(`${this.url}/matriculas/${idMatricula}/retiro`, null);
  }
  entregar(idTarea: number, idArchivo: number | null, comentario: string | null) {
    return this.http.post<Entrega>(`${this.url}/tareas/${idTarea}/entregas`, { idArchivo, comentario });
  }

  entregas(idTarea: number) {
    return this.http.get<Entrega[]>(`${this.url}/tareas/${idTarea}/entregas`);
  }
  evaluaciones(idSeccion: number) {
    return this.http.get<Evaluacion[]>(`${this.url}/secciones/${idSeccion}/evaluaciones`);
  }
  crearEvaluacion(idSeccion: number, d: { nombre: string; tipo: TipoEvaluacion; peso: number; idUnidad: number | null; fecha: string | null }) {
    return this.http.post<Evaluacion>(`${this.url}/secciones/${idSeccion}/evaluaciones`, d);
  }
  libreta(idSeccion: number) {
    return this.http.get<FilaLibreta[]>(`${this.url}/secciones/${idSeccion}/notas`);
  }
  ponerNota(d: { idMatricula: number; idEvaluacion: number; calificacion: number; comentarioDocente: string | null }) {
    return this.http.put<Nota>(`${this.url}/notas`, d);
  }
  ranking(idSeccion: number) {
    return this.http.get<FilaRanking[]>(`${this.url}/secciones/${idSeccion}/ranking`);
  }
  riesgo(idSeccion: number) {
    return this.http.get<FilaRiesgo[]>(`${this.url}/secciones/${idSeccion}/riesgo`);
  }
  asistencia(idSesion: number) {
    return this.http.get<Asistencia[]>(`${this.url}/sesiones/${idSesion}/asistencia`);
  }
  registrarAsistencia(idSesion: number, filas: { idMatricula: number; estado: EstadoAsistencia; observacion: string | null }[]) {
    return this.http.post<unknown>(`${this.url}/sesiones/${idSesion}/asistencia`, filas);
  }
}
