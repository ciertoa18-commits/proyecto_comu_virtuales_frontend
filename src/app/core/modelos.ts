
export type Rol = 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'PENDIENTE';

export interface Pagina<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

export interface RespuestaLogin {
  ok: boolean;
  token: string;
  idUsuario: number;
  rol: Rol;
}
export interface RespuestaCuenta {
  estado: string;
  mensaje: string;
}
export interface DatosRegistro {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: 'ESTUDIANTE' | 'DOCENTE';
  especialidad: string | null;
  telefono: string | null;
  idIdiomaPref: number | null;
  correoRecuperacion: string;
}
export interface Usuario {
  idUsuario: number;
  idRol: number;
  correo: string;
  nombres: string;
  apellidos: string;
  especialidad: string | null;
  telefono: string | null;
  correoRecuperacion: string | null;
  idFotoPerfil: number | null;
  idIdiomaPref: number | null;
  estado: EstadoUsuario;
  fechaRegistro: string;
  fechaActualizacion: string | null;
}
export interface DatosPerfil {
  nombres: string;
  apellidos: string;
  especialidad: string | null;
  idIdiomaPref: number | null;
  telefono: string | null;
  correoRecuperacion: string | null;
}
export interface Persona {
  idUsuario: number;
  nombres: string;
  apellidos: string;
  rol: Rol | '';
  especialidad: string | null;
  idFotoPerfil: number | null;
}
export interface UsuarioResumen {
  idUsuario: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
  estado: EstadoUsuario;
  especialidad: string | null;
  telefono: string | null;
  fechaRegistro: string;
  bloqueado: boolean;
}
export interface DatosNuevoUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: Rol;
  especialidad: string | null;
  telefono: string | null;
  correoRecuperacion: string;
}
export interface UsuarioDetalle {
  idUsuario: number;
  nombres: string;
  apellidos: string;
  correo: string;
  correoRecuperacion: string | null;
  rol: Rol;
  estado: EstadoUsuario;
  especialidad: string | null;
  telefono: string | null;
  idIdiomaPref: number | null;
  idioma: string | null;
  intentosFallidos: number | null;
  bloqueadoHasta: string | null;
  bloqueado: boolean;
  fechaRegistro: string;
  fechaActualizacion: string | null;
}
export interface DatosEdicionUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
  especialidad: string | null;
  telefono: string | null;
  correoRecuperacion: string;
  idIdiomaPref: number | null;
}

export interface Categoria { idCategoria: number; nombre: string; descripcion: string | null; }
export interface Idioma { idIdioma: number; codigo: string; nombre: string; }
export interface Pueblo { idPueblo: number; nombre: string; familiaLinguistica: string | null; }
export interface Periodo { idPeriodo: number; nombre: string; fechaInicio: string; fechaFin: string; estado: 'PLANIFICADO' | 'ABIERTO' | 'CERRADO'; }
export interface Archivo { idArchivo: number; idSubidoPor: number; nombreOriginal: string; extension: string; tipoMime: string; tamanoBytes: number; fechaSubida: string; }

export type Visibilidad = 'PUBLICA' | 'PRIVADA';
export interface Comunidad {
  idComunidad: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idIdioma: number | null;
  idPueblo: number | null;
  visibilidad: Visibilidad;
  moderacionPrevia: boolean;
  estado: 'ACTIVA' | 'INACTIVA';
  idImagen: number | null;
  idCreador: number;
  fechaCreacion: string;
}
export interface DatosComunidad {
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idIdioma: number | null;
  idPueblo: number | null;
  visibilidad: Visibilidad;
  moderacionPrevia: boolean;
  idImagen: number | null;
}
export interface MiComunidad {
  idComunidad: number;
  estado: 'MIEMBRO' | 'SOLICITUD_PENDIENTE';
  rolComunidad: 'MIEMBRO' | 'MODERADOR' | 'ADMINISTRADOR' | '';
}
export interface Miembro {
  idUsuario: number;
  nombres: string;
  apellidos: string;
  rol: Rol;
  rolComunidad: 'MIEMBRO' | 'MODERADOR' | 'ADMINISTRADOR';
}
export interface Solicitud {
  idSolicitud: number;
  idComunidad: number;
  idUsuario: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  mensaje: string | null;
  fechaSolicitud: string;
  motivoRechazo: string | null;
}
export interface Evento {
  idEvento: number;
  idComunidad: number;
  idSeccion: number | null;
  idCreador: number;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  enlace: string | null;
}

export interface Autor { id: number; nombres: string; apellidos: string; rol: string; }
export interface Publicacion {
  idPublicacion: number;
  idComunidad: number;
  idSeccion: number | null;
  idAutor: number;
  titulo: string | null;
  contenido: string | null;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fechaPublicacion: string;
  fechaEdicion: string | null;
}
export interface VistaPublicacion {
  publicacion: Publicacion;
  autor: Autor;
  adjuntos: { idPublicacion: number; idArchivo: number; orden: number }[];
}
export interface Comentario {
  idComentario: number;
  idPublicacion: number | null;
  idComentarioPadre: number | null;
  idAutor: number;
  contenido: string;
  fechaComentario: string;
  eliminado: boolean;
}
export interface VistaComentario { comentario: Comentario; autor: Autor; }

export interface Curso { idCurso: number; idComunidad: number; codigo: string; nombre: string; descripcion: string | null; estado: 'ACTIVO' | 'INACTIVO'; }
export interface Seccion {
  idSeccion: number;
  idCurso: number;
  idPeriodo: number;
  idDocente: number;
  grupo: string;
  cupoMaximo: number | null;
  salaVirtual: string | null;
  estado: 'ABIERTA' | 'EN_CURSO' | 'CERRADA';
}
export interface SeccionResumen { idSeccion: number; grupo: string; idCurso: number; curso: string; estado: string | null; }
export interface Unidad { idUnidad: number; idSeccion: number; nombre: string; descripcion: string | null; orden: number; }
export interface Sesion { idSesion: number; idUnidad: number; titulo: string; orden: number; fechaInicio: string | null; duracionMin: number | null; enlaceClase: string | null; }
export interface Clase { sesion: Sesion; enlace: string | null; }
export type TipoRecurso = 'DOCUMENTO' | 'VIDEO' | 'ENLACE' | 'TAREA';
export interface Recurso {
  idRecurso: number;
  idUnidad: number;
  idSesion: number | null;
  idAutor: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoRecurso;
  idIdioma: number | null;
  idArchivo: number | null;
  urlExterna: string | null;
  fechaPublicacion: string;
}
export interface Matricula {
  idMatricula: number;
  idSeccion: number;
  idUsuario: number;
  fechaMatricula: string;
  estado: 'MATRICULADO' | 'RETIRADO' | 'APROBADO' | 'DESAPROBADO';
  notaFinal: number | null;
}
export type TipoEvaluacion = 'PRACTICA' | 'TAREA' | 'EXAMEN' | 'PROYECTO' | 'PARTICIPACION';
export interface Evaluacion { idEvaluacion: number; idSeccion: number; idUnidad: number | null; nombre: string; tipo: TipoEvaluacion; peso: number; fecha: string | null; }
export interface Nota { idNota: number; idMatricula: number; idEvaluacion: number; calificacion: number; comentarioDocente: string | null; }
export interface Alumno { idUsuario: number; nombres: string; apellidos: string; }
export interface FilaLibreta { matricula: Matricula; estudiante: Alumno; notas: Nota[]; promedio: number; }
export interface MiCurso { matricula: Matricula; curso: string; grupo: string; evaluaciones: Evaluacion[]; notas: Nota[]; promedio: number; }
export interface FilaRanking { idUsuario: number; estudiante: Alumno; promedio: number; }
export interface FilaRiesgo { matricula: Matricula; estudiante: Alumno; promedio: number; }
export type EstadoAsistencia = 'PRESENTE' | 'TARDANZA' | 'FALTA' | 'JUSTIFICADA';
export interface Asistencia { idAsistencia: number; idSesion: number; idMatricula: number; estado: EstadoAsistencia; observacion: string | null; }
export interface Entrega { idEntrega: number; idRecurso: number; idMatricula: number; idArchivo: number | null; comentario: string | null; fechaEntrega: string; estado: 'ENTREGADA' | 'TARDIA' | 'CALIFICADA'; }

export type TipoNotificacion =
  | 'SOLICITUD_INGRESO' | 'SOLICITUD_RESPUESTA' | 'NUEVA_PUBLICACION' | 'NUEVO_COMENTARIO'
  | 'NUEVO_RECURSO' | 'EVENTO' | 'MENSAJE' | 'SISTEMA' | 'AVISO';
export interface Notificacion {
  idNotificacion: number;
  idDestinatario: number;
  idEmisor: number | null;
  idComunidad: number | null;
  tipo: TipoNotificacion;
  titulo: string;
  contenido: string | null;
  entidadTipo: string | null;
  entidadId: number | null;
  leida: boolean;
  fechaCreacion: string;
}
export type DestinoAviso = 'TODOS' | 'DOCENTES' | 'ESTUDIANTES' | 'SECCION' | 'USUARIO';
export interface DatosAviso { destino: DestinoAviso; idSeccion: number | null; idUsuario: number | null; titulo: string; contenido: string | null; }
export interface Mensaje { idMensaje: number; idEmisor: number; idReceptor: number; contenido: string; leido: boolean; fechaEnvio: string; }

export interface ReporteIdioma { ID_IDIOMA: number; NOMBRE: string; COMUNIDADES: number; RECURSOS: number; }
export interface ReporteDocente { ID_USUARIO: number; NOMBRES: string; APELLIDOS: string; SECCIONES: number; MATRICULAS: number; }

export const NOMBRE_ROL: Record<Rol, string> = { ESTUDIANTE: 'Estudiante', DOCENTE: 'Docente', ADMIN: 'Administrador' };
export const TIPOS_RECURSO: TipoRecurso[] = ['DOCUMENTO', 'VIDEO', 'ENLACE', 'TAREA'];
export const TIPOS_EVALUACION: TipoEvaluacion[] = ['PRACTICA', 'TAREA', 'EXAMEN', 'PROYECTO', 'PARTICIPACION'];
export const ESTADOS_ASISTENCIA: EstadoAsistencia[] = ['PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADA'];
export const NOTA_APROBATORIA = 10.5;
export const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@(perueduca\.pe|minedu\.gob\.pe)$/i;
export function dominioCorreo(rol: Rol): string {
  return rol === 'ESTUDIANTE' ? '@perueduca.pe' : '@minedu.gob.pe';
}
export function patronCorreo(rol: Rol): RegExp {
  return rol === 'ESTUDIANTE' ? /^[A-Za-z0-9._%+-]+@perueduca\.pe$/i : /^[A-Za-z0-9._%+-]+@minedu\.gob\.pe$/i;
}
export function mensajeCorreo(rol: Rol): string {
  return rol === 'ESTUDIANTE'
    ? 'Los estudiantes usan su correo @perueduca.pe (ej.: nombre@perueduca.pe).'
    : 'Docentes y administradores usan su correo @minedu.gob.pe (ej.: nombre@minedu.gob.pe).';
}
export const PATRON_TELEFONO = /^[0-9]{9}$/;
