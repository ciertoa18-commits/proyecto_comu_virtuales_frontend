import { Routes } from '@angular/router';
import { conPermiso, conSesion, sinSesion } from './core/sesion/guardias';
import { Portal } from './layout/portal';

export const rutas: Routes = [
  { path: 'login', canActivate: [sinSesion], loadComponent: () => import('./paginas/publico/login').then((m) => m.Login) },
  { path: 'registro', canActivate: [sinSesion], loadComponent: () => import('./paginas/publico/registro').then((m) => m.Registro) },
  { path: 'recuperar', canActivate: [sinSesion], loadComponent: () => import('./paginas/publico/recuperar').then((m) => m.Recuperar) },

  {
    path: '',
    component: Portal,
    canActivate: [conSesion],
    canActivateChild: [conSesion],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./paginas/inicio/inicio').then((m) => m.Inicio) },

      { path: 'comunidades', loadComponent: () => import('./paginas/comunidades/lista').then((m) => m.ListaComunidades) },
      {
        path: 'comunidades/nueva',
        canActivate: [conPermiso],
        data: { accion: 'COMUNIDAD_CREAR' },
        loadComponent: () => import('./paginas/comunidades/formulario').then((m) => m.FormularioComunidad),
      },
      {
        path: 'comunidades/importar',
        canActivate: [conPermiso],
        data: { accion: 'COMUNIDAD_CREAR' },
        loadComponent: () => import('./paginas/comunidades/importar').then((m) => m.ImportarComunidades),
      },
      {
        path: 'comunidades/:id/editar',
        canActivate: [conPermiso],
        data: { accion: 'COMUNIDAD_CREAR' },
        loadComponent: () => import('./paginas/comunidades/formulario').then((m) => m.FormularioComunidad),
      },
      { path: 'comunidades/:id', loadComponent: () => import('./paginas/comunidades/detalle').then((m) => m.DetalleComunidad) },
      { path: 'publicaciones/:id', loadComponent: () => import('./paginas/comunidades/publicacion').then((m) => m.PaginaPublicacion) },

      {
        path: 'mis-cursos',
        canActivate: [conPermiso],
        data: { accion: 'CURSOS_PROPIOS' },
        loadComponent: () => import('./paginas/cursos/mis-cursos').then((m) => m.MisCursos),
      },
      { path: 'secciones/:id', loadComponent: () => import('./paginas/cursos/seccion').then((m) => m.PaginaSeccion) },
      {
        path: 'mis-recursos',
        canActivate: [conPermiso],
        data: { accion: 'TAREA_ENTREGAR' },
        loadComponent: () => import('./paginas/cursos/mis-recursos').then((m) => m.MisRecursos),
      },
      {
        path: 'mis-notas',
        canActivate: [conPermiso],
        data: { accion: 'TAREA_ENTREGAR' },
        loadComponent: () => import('./paginas/cursos/mis-notas').then((m) => m.MisNotas),
      },

      { path: 'notificaciones', loadComponent: () => import('./paginas/comunicacion/notificaciones').then((m) => m.Notificaciones) },
      {
        path: 'notificaciones/enviar',
        canActivate: [conPermiso],
        data: { accion: 'AVISO_ENVIAR' },
        loadComponent: () => import('./paginas/comunicacion/enviar-aviso').then((m) => m.EnviarAviso),
      },
      { path: 'mensajes', loadComponent: () => import('./paginas/comunicacion/mensajes').then((m) => m.Mensajes) },
      { path: 'perfil', loadComponent: () => import('./paginas/perfil/perfil').then((m) => m.Perfil) },

      {
        path: 'admin/usuarios',
        canActivate: [conPermiso],
        data: { accion: 'USUARIOS_GESTIONAR' },
        loadComponent: () => import('./paginas/admin/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'admin/catalogos',
        canActivate: [conPermiso],
        data: { accion: 'COMUNIDAD_CREAR' },
        loadComponent: () => import('./paginas/admin/catalogos').then((m) => m.Catalogos),
      },
      {
        path: 'admin/recuperar-cuenta',
        canActivate: [conPermiso],
        data: { accion: 'USUARIOS_GESTIONAR' },
        loadComponent: () => import('./paginas/admin/recuperar-cuenta').then((m) => m.RecuperarCuenta),
      },
      {
        path: 'admin/solicitudes',
        canActivate: [conPermiso],
        data: { accion: 'SOLICITUDES_RESOLVER' },
        loadComponent: () => import('./paginas/admin/solicitudes').then((m) => m.Solicitudes),
      },
      {
        path: 'admin/reportes',
        canActivate: [conPermiso],
        data: { accion: 'REPORTES_VER' },
        loadComponent: () => import('./paginas/admin/reportes').then((m) => m.Reportes),
      },
      { path: 'sin-permiso', loadComponent: () => import('./paginas/errores/sin-permiso').then((m) => m.SinPermiso) },
    ],
  },
  { path: '**', loadComponent: () => import('./paginas/errores/no-encontrado').then((m) => m.NoEncontrado) },
];
