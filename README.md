# Comunidades Virtuales · Frontend

Frontend de **Comunidades Virtuales (PerúEduca / MINEDU)** hecho en **Angular 22**.
Consume la API REST del backend (Spring Boot + Oracle): **https://github.com/ciertoa18-commits/proyecto_comu_virtuales_backend**

## Cómo correrlo en Visual Studio Code

Necesitas **Node.js 22 o superior** (`node -v` para verificar).

1. Enciende el backend en IntelliJ (debe responder en `http://localhost:8081`).
2. Abre esta carpeta en VS Code: **Archivo → Abrir carpeta → `comunidades-frontend`**.
3. Abre la terminal: **Terminal → Nueva terminal** (o `Ctrl + ñ`).
4. Solo la primera vez, instala las librerías:
   ```
   npm install
   ```
5. Corre el proyecto (se abre solo en el navegador):
   ```
   npm start
   ```
6. Entra a **http://localhost:4201**.

Para detenerlo: `Ctrl + C` en la terminal.

> El frontend llama a `/api/v1` y `proxy.conf.json` lo redirige a `http://127.0.0.1:8081`.
> Si el backend corre en otra dirección o puerto, cámbiala en `proxy.conf.json` y reinicia `npm start`.

## Usuarios de prueba

Todos usan la contraseña `Comunidades2026!` (solo para desarrollo):

| Rol | Correo |
|---|---|
| Administrador | admin@minedu.gob.pe, admin.prueba@minedu.gob.pe |
| Docente | jcampos@minedu.gob.pe, mhuaman@minedu.gob.pe, docente.prueba@minedu.gob.pe |
| Estudiante | achumpate@perueduca.pe, lsantos@perueduca.pe, kmayta@perueduca.pe, pnaquiri@perueduca.pe, alumno.prueba@perueduca.pe |

**Regla de correo por rol** (se valida en el formulario, en el backend y en la base de datos):

- Estudiante → solo `@perueduca.pe`
- Docente y Administrador → solo `@minedu.gob.pe`

## Qué hace cada rol

| Pantalla | Estudiante | Docente | Admin |
|---|:-:|:-:|:-:|
| Login, crear cuenta, recuperar contraseña | ✔ | ✔ | — |
| Inicio, comunidades, muro, comentarios, eventos | ✔ | ✔ | ✔ |
| Unirse / solicitar ingreso a comunidad privada | ✔ | ✔ | — |
| Matricularse, ver contenido, entregar tareas, mis notas | ✔ | — | — |
| Unidades, sesiones, recursos, evaluaciones, notas, asistencia, ranking | — | ✔ (sus secciones) | ✔ |
| Enviar avisos | — | sus secciones o una persona | todos / docentes / alumnos / sección / persona |
| Crear comunidades, cursos y secciones | — | — | ✔ |
| Usuarios (aprobar docentes), solicitudes, reportes | — | — | ✔ |
| Mensajes, notificaciones, mi perfil | ✔ | ✔ | ✔ |

## Estructura

```
src/
├── styles.css                 Estilos globales (colores y formas del proyecto anterior)
├── environments/              Dirección del backend
└── app/
    ├── app.routes.ts          Todas las rutas (con guardias por sesión y por rol)
    ├── core/
    │   ├── modelos.ts         Tipos de datos del backend
    │   ├── api/               Un servicio por módulo del backend (cuenta, comunidad, académico, ...)
    │   ├── sesion/            Sesión (JWT), permisos por rol, guardias e interceptores
    │   └── util/              Errores, textos, fechas y nombres de personas
    ├── shared/                Modal, paginador, imagen y descarga de archivos, *siPuede
    ├── layout/                Portal: barra coral + menú lateral
    └── paginas/
        ├── publico/           login, registro, recuperar
        ├── inicio/
        ├── comunidades/       lista, detalle (muro, cursos, eventos, miembros), formulario, publicación
        ├── cursos/            mis cursos, sección (contenido, evaluaciones, notas, asistencia, seguimiento), mis recursos, mis notas
        ├── comunicacion/      notificaciones, enviar aviso, mensajes
        ├── perfil/
        ├── admin/             usuarios, solicitudes, reportes
        └── errores/
```

## Seguridad

- El token JWT se guarda en `sessionStorage` (se borra al cerrar la pestaña: PCs compartidas).
- La sesión se cierra sola cuando vence el token (1 hora) o si el backend responde 401.
- El menú y los botones se ocultan según el rol, pero **el backend vuelve a validar todo**.
- Los archivos e imágenes se descargan con el token (nunca con enlaces públicos).
