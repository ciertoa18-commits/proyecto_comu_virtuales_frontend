import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaLogin, Rol, Usuario } from '../modelos';
import { Accion, rolPuede } from './permisos';

export interface Sesion {
  token: string;
  vence: number; // milisegundos (Date.now())
  idUsuario: number;
  rol: Rol;
  nombre: string;
  correo: string;
}

// sessionStorage: la sesión se borra al cerrar la pestaña (PCs compartidas en colegios).
const CLAVE = 'cv.sesion';

/** Lee el "exp" del JWT para saber cuándo vence (el backend lo emite por 1 hora). */
function venceToken(token: string): number {
  try {
    const carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof carga.exp === 'number') return carga.exp * 1000;
  } catch {
    /* token raro: se usa 1 hora */
  }
  return Date.now() + 60 * 60 * 1000;
}

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly actual = signal<Sesion | null>(this.leer());
  private reloj?: ReturnType<typeof setTimeout>;

  readonly sesion = this.actual.asReadonly();
  readonly activa = computed(() => this.actual() !== null);
  readonly rol = computed(() => this.actual()?.rol);
  readonly token = computed(() => this.actual()?.token ?? null);

  constructor() {
    const s = this.actual();
    if (s) this.programarVencimiento(s);
  }

  puede(accion: Accion): boolean {
    return rolPuede(this.actual()?.rol, accion);
  }

  ingresar(correo: string, password: string): Observable<Sesion> {
    const url = environment.apiUrl;
    return this.http.post<RespuestaLogin>(`${url}/auth/login`, { correo, password }).pipe(
      map((r) => ({
        token: r.token,
        vence: venceToken(r.token),
        idUsuario: r.idUsuario,
        rol: r.rol,
        nombre: correo,
        correo,
      })),
      tap((s) => this.guardar(s)),
      // Trae nombres y apellidos para mostrarlos en la barra.
      switchMap((s) =>
        this.http.get<{ usuario: Usuario }>(`${url}/me`).pipe(
          map(({ usuario }) => this.renombrar(`${usuario.nombres} ${usuario.apellidos}`) ?? s),
          catchError(() => of(s)),
        ),
      ),
    );
  }

  renombrar(nombre: string): Sesion | null {
    const s = this.actual();
    if (!s) return null;
    const nueva = { ...s, nombre };
    this.guardar(nueva);
    return nueva;
  }

  /** Botón "Cerrar sesión": avisa al backend (revoca el token) y vuelve al login. */
  salir(): void {
    const token = this.token();
    if (token) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, null, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ error: () => undefined });
    }
    this.terminar('salio');
  }

  /** Borra la sesión local y manda al login con un aviso. */
  terminar(motivo: 'salio' | 'vencio', volverA?: string): void {
    clearTimeout(this.reloj);
    this.actual.set(null);
    sessionStorage.removeItem(CLAVE);
    void this.router.navigate(['/login'], {
      queryParams: { motivo, volver: volverA && volverA.startsWith('/') && !volverA.startsWith('/login') ? volverA : undefined },
    });
  }

  private guardar(s: Sesion): void {
    sessionStorage.setItem(CLAVE, JSON.stringify(s));
    this.actual.set(s);
    this.programarVencimiento(s);
  }

  private programarVencimiento(s: Sesion): void {
    clearTimeout(this.reloj);
    this.reloj = setTimeout(() => this.terminar('vencio', this.router.url), Math.max(0, s.vence - Date.now()));
  }

  private leer(): Sesion | null {
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Sesion | null;
      if (s && typeof s.vence === 'number' && s.vence > Date.now()) return s;
    } catch {
      /* dato dañado */
    }
    sessionStorage.removeItem(CLAVE);
    return null;
  }
}
