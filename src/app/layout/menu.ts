import { Accion } from '../core/sesion/permisos';
import { Rol } from '../core/modelos';
import { NombreIcono } from '../shared/icono';

export interface OpcionMenu {
  texto: string;
  ruta: string;
  icono: NombreIcono;
  accion?: Accion;
  roles?: Rol[];
  exacta?: boolean;
}

export const MENU: { grupo: string; opciones: OpcionMenu[] }[] = [
  {
    grupo: 'Principal',
    opciones: [
      { texto: 'Inicio', ruta: '/inicio', icono: 'inicio' },
      { texto: 'Comunidades', ruta: '/comunidades', icono: 'comunidades' },
      { texto: 'Mis cursos', ruta: '/mis-cursos', icono: 'libro', roles: ['ESTUDIANTE'] },
      { texto: 'Mis clases', ruta: '/mis-cursos', icono: 'libro', roles: ['DOCENTE'] },
      { texto: 'Mis recursos', ruta: '/mis-recursos', icono: 'biblioteca', roles: ['ESTUDIANTE'] },
      { texto: 'Mis notas', ruta: '/mis-notas', icono: 'archivo', roles: ['ESTUDIANTE'] },
    ],
  },
  {
    grupo: 'Comunicación',
    opciones: [
      { texto: 'Notificaciones', ruta: '/notificaciones', icono: 'campana', exacta: true },
      { texto: 'Enviar aviso', ruta: '/notificaciones/enviar', icono: 'megafono', accion: 'AVISO_ENVIAR' },
      { texto: 'Mensajes', ruta: '/mensajes', icono: 'mensaje' },
    ],
  },
  {
    grupo: 'Administración',
    opciones: [
      { texto: 'Usuarios', ruta: '/admin/usuarios', icono: 'birrete', accion: 'USUARIOS_GESTIONAR' },
      { texto: 'Recuperar cuenta', ruta: '/admin/recuperar-cuenta', icono: 'llave', accion: 'USUARIOS_GESTIONAR' },
      { texto: 'Solicitudes', ruta: '/admin/solicitudes', icono: 'bandeja', accion: 'SOLICITUDES_RESOLVER' },
      { texto: 'Reportes', ruta: '/admin/reportes', icono: 'grafico', accion: 'REPORTES_VER' },
    ],
  },
  { grupo: 'Cuenta', opciones: [{ texto: 'Mi perfil', ruta: '/perfil', icono: 'usuario' }] },
];
