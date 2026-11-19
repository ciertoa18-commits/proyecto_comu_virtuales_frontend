import { Accion } from '../core/sesion/permisos';
import { Rol } from '../core/modelos';

export interface OpcionMenu {
  texto: string;
  ruta: string;
  icono: string;
  accion?: Accion;
  roles?: Rol[];
  exacta?: boolean;
}

export const MENU: { grupo: string; opciones: OpcionMenu[] }[] = [
  {
    grupo: 'Principal',
    opciones: [
      { texto: 'Inicio', ruta: '/inicio', icono: '🏠' },
      { texto: 'Comunidades', ruta: '/comunidades', icono: '👥' },
      { texto: 'Mis cursos', ruta: '/mis-cursos', icono: '📘', roles: ['ESTUDIANTE'] },
      { texto: 'Mis clases', ruta: '/mis-cursos', icono: '📘', roles: ['DOCENTE'] },
      { texto: 'Mis recursos', ruta: '/mis-recursos', icono: '📚', roles: ['ESTUDIANTE'] },
      { texto: 'Mis notas', ruta: '/mis-notas', icono: '📝', roles: ['ESTUDIANTE'] },
    ],
  },
  {
    grupo: 'Comunicación',
    opciones: [
      { texto: 'Notificaciones', ruta: '/notificaciones', icono: '🔔', exacta: true },
      { texto: 'Enviar aviso', ruta: '/notificaciones/enviar', icono: '📣', accion: 'AVISO_ENVIAR' },
      { texto: 'Mensajes', ruta: '/mensajes', icono: '💬' },
    ],
  },
  {
    grupo: 'Administración',
    opciones: [
      { texto: 'Usuarios', ruta: '/admin/usuarios', icono: '🧑‍🏫', accion: 'USUARIOS_GESTIONAR' },
      { texto: 'Solicitudes', ruta: '/admin/solicitudes', icono: '📥', accion: 'SOLICITUDES_RESOLVER' },
      { texto: 'Reportes', ruta: '/admin/reportes', icono: '📊', accion: 'REPORTES_VER' },
    ],
  },
  { grupo: 'Cuenta', opciones: [{ texto: 'Mi perfil', ruta: '/perfil', icono: '👤' }] },
];
