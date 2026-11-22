import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent, merge } from 'rxjs';
import { TiempoRealService } from '../../core/util/tiempo-real.service';
import { Router, RouterLink } from '@angular/router';
import { ComunicacionApi } from '../../core/api/comunicacion.api';
import { Notificacion, TipoNotificacion } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { DialogoService } from '../../shared/dialogo';
import { Icono, NombreIcono } from '../../shared/icono';
import { Paginador } from '../../shared/paginador';
import { SiPuede } from '../../shared/si-puede';

const ICONO: Record<TipoNotificacion, NombreIcono> = {
  SOLICITUD_INGRESO: 'bandeja', SOLICITUD_RESPUESTA: 'check', NUEVA_PUBLICACION: 'archivo', NUEVO_COMENTARIO: 'mensaje',
  NUEVO_RECURSO: 'biblioteca', EVENTO: 'calendario', MENSAJE: 'correo', SISTEMA: 'ajustes', AVISO: 'megafono',
};

@Component({
  selector: 'cv-notificaciones',
  imports: [DatePipe, RouterLink, Icono, Paginador, SiPuede],
  template: `
    <div class="cabecera">
      <h1>Notificaciones</h1>
      <div class="acciones">
        <a *siPuede="'AVISO_ENVIAR'" class="btn btn-primario" routerLink="/notificaciones/enviar"><cv-icono nombre="megafono" [tamano]="16" /> Enviar aviso</a>
        <button class="btn" type="button" [disabled]="!hayNoLeidas()" (click)="todas()"><cv-icono nombre="check" [tamano]="16" /> Marcar todas como leídas</button>
      </div>
    </div>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="bloque">
      @for (n of lista(); track n.idNotificacion) {
        <div class="noti" [class.nueva]="!n.leida">
          <button class="abrir" type="button" (click)="abrir(n)">
            <span class="ico"><cv-icono [nombre]="icono[n.tipo]" [tamano]="20" /></span>
            <span class="txt">
              <strong>@if (!n.leida) { <span class="etiqueta-nueva">Nueva</span> }{{ n.titulo }}</strong>
              @if (n.contenido) { <span class="cont">{{ n.contenido }}</span> }
              <small class="apagado">{{ n.fechaCreacion | date: 'dd/MM/yyyy h:mm a' }}@if (n.idEmisor) { · de {{ personas.nombre(n.idEmisor) }} }</small>
            </span>
          </button>
          <div class="botones-noti">
            <button class="mini-btn" type="button" [title]="n.leida ? 'Marcar como no leída' : 'Marcar como leída'" [attr.aria-label]="n.leida ? 'Marcar como no leída' : 'Marcar como leída'" (click)="alternarLeida(n)">
              <cv-icono [nombre]="n.leida ? 'correo' : 'check'" [tamano]="18" /><span>{{ n.leida ? 'Marcar como no leída' : 'Marcar como leída' }}</span>
            </button>
            <button class="mini-btn borrar" type="button" title="Eliminar" aria-label="Eliminar notificación" (click)="eliminar(n)">
              <cv-icono nombre="basura" [tamano]="18" /><span>Eliminar</span>
            </button>
          </div>
        </div>
      } @empty {
        <p class="vacio">{{ cargando() ? 'Cargando...' : 'No tienes notificaciones.' }}</p>
      }
    </div>
    <cv-paginador [pagina]="pagina()" [total]="totalPaginas()" (ir)="cargar($event)" />
  `,
  styles: `
    .noti { display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--line); padding: 4px 6px; border-radius: 8px; }
    .noti:first-child { border-top: 0; }
    .noti:hover { background: var(--superficie-2); }
    .noti.nueva { background: var(--superficie-2); }
    .noti.nueva strong { font-weight: 800; }
    .noti:not(.nueva) strong { font-weight: 600; }
    .abrir { flex: 1; min-width: 0; display: flex; gap: 14px; align-items: flex-start; text-align: left; background: none; border: 0; padding: 10px 0; font: inherit; color: inherit; cursor: pointer; }
    .botones-noti { display: flex; gap: 4px; flex: none; }
    .mini-btn { display: inline-flex; align-items: center; gap: .3rem; background: none; border: 1px solid transparent; border-radius: 8px; padding: .4rem .55rem; color: var(--muted); font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .mini-btn:hover { background: var(--superficie); border-color: var(--line); color: var(--ink); }
    .mini-btn.borrar:hover { color: var(--rojo); border-color: var(--rojo); background: var(--rojo-claro); }
    @media (max-width: 640px) { .mini-btn span { display: none; } }
    .ico { width: 38px; height: 38px; border-radius: 50%; background: var(--coral-claro); color: var(--acento-texto-osc); display: flex; align-items: center; justify-content: center; flex: none; }
    .acciones .btn { display: inline-flex; align-items: center; gap: .3rem; }
    .txt { flex: 1; display: flex; flex-direction: column; gap: .15rem; }
    .cont { color: var(--ink-2); font-size: .9rem; white-space: pre-wrap; }
    .etiqueta-nueva { display: inline-block; background: var(--rojo); color: #fff; font-size: .68rem; font-weight: 800; letter-spacing: .3px; text-transform: uppercase; border-radius: 999px; padding: .1rem .5rem; margin-right: .45rem; vertical-align: .12em; }
    .noti.nueva { box-shadow: inset 4px 0 0 var(--rojo); }
  `,
})
export class Notificaciones implements OnInit {
  private readonly api = inject(ComunicacionApi);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  protected readonly personas = inject(PersonasService);
  protected readonly icono = ICONO;
  protected readonly lista = signal<Notificacion[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly dialogo = inject(DialogoService);
  protected readonly hayNoLeidas = computed(() => this.lista().some((n) => !n.leida));

  private readonly tiempoReal = inject(TiempoRealService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.cargar(0);
    // Se recarga con avisos en vivo y al volver a la pestaña (cambios hechos en otra ventana)
    const alVolver = fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible'));
    merge(this.tiempoReal.de('NOTIFICACION'), alVolver)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar(this.pagina()));
  }

  protected cargar(p: number): void {
    this.api.notificaciones(p).subscribe({
      next: (r) => {
        this.lista.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  /** Cambia la notificación en pantalla al instante; si el servidor falla, se deshace. */
  private poner(id: number, leida: boolean): void {
    this.lista.update((l) => l.map((x) => (x.idNotificacion === id ? { ...x, leida } : x)));
  }

  protected todas(): void {
    const antes = this.lista();
    this.error.set(null);
    this.lista.update((l) => l.map((x) => ({ ...x, leida: true })));
    this.api.sinLeer.set(0);
    this.api.marcarTodas().subscribe({
      error: (e) => {
        this.lista.set(antes);
        this.api.contarSinLeer().subscribe();
        this.error.set(textoError(e));
      },
    });
  }

  protected alternarLeida(n: Notificacion): void {
    this.error.set(null);
    const leida = !n.leida;
    this.poner(n.idNotificacion, leida);
    this.api.sinLeer.update((v) => Math.max(0, v + (leida ? -1 : 1)));
    (leida ? this.api.marcarLeida(n.idNotificacion) : this.api.marcarNoLeida(n.idNotificacion)).subscribe({
      error: (e) => {
        this.poner(n.idNotificacion, !leida);
        this.api.contarSinLeer().subscribe();
        this.error.set(textoError(e));
      },
    });
  }

  protected async eliminar(n: Notificacion): Promise<void> {
    const ok = await this.dialogo.confirmar(`¿Eliminar la notificación "${n.titulo}"?`, { titulo: 'Eliminar notificación', aceptar: 'Eliminar', peligro: true });
    if (!ok) return;
    this.error.set(null);
    const antes = this.lista();
    this.lista.update((l) => l.filter((x) => x.idNotificacion !== n.idNotificacion));
    if (!n.leida) this.api.sinLeer.update((v) => Math.max(0, v - 1));
    this.api.eliminarNotificacion(n.idNotificacion).subscribe({
      next: () => {
        if (this.lista().length === 0 && this.pagina() > 0) this.cargar(this.pagina() - 1);
      },
      error: (e) => {
        this.lista.set(antes);
        this.api.contarSinLeer().subscribe();
        this.error.set(textoError(e));
      },
    });
  }

  protected abrir(n: Notificacion): void {
    if (!n.leida) {
      this.poner(n.idNotificacion, true);
      this.api.sinLeer.update((v) => Math.max(0, v - 1));
      this.api.marcarLeida(n.idNotificacion).subscribe({ error: () => this.api.contarSinLeer().subscribe() });
    }
    const destino = this.destino(n);
    if (destino) void this.router.navigate(destino);
  }

  private destino(n: Notificacion): unknown[] | null {
    if (n.entidadTipo === 'PUBLICACION' && n.entidadId) return ['/publicaciones', n.entidadId];
    if (n.entidadTipo === 'COMENTARIO' && n.idComunidad) return ['/comunidades', n.idComunidad];
    if (n.tipo === 'MENSAJE') return ['/mensajes'];
    if (n.entidadTipo === 'SOLICITUD' && this.sesion.puede('SOLICITUDES_RESOLVER')) return ['/admin/solicitudes'];
    if (n.entidadTipo === 'USUARIO' && this.sesion.puede('USUARIOS_GESTIONAR')) return ['/admin/usuarios'];
    return n.idComunidad ? ['/comunidades', n.idComunidad] : null;
  }
}
