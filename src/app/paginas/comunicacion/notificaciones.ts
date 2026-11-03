import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ComunicacionApi } from '../../core/api/comunicacion.api';
import { Notificacion, TipoNotificacion } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { Paginador } from '../../shared/paginador';
import { SiPuede } from '../../shared/si-puede';

const ICONO: Record<TipoNotificacion, string> = {
  SOLICITUD_INGRESO: '📥', SOLICITUD_RESPUESTA: '✅', NUEVA_PUBLICACION: '📰', NUEVO_COMENTARIO: '💬',
  NUEVO_RECURSO: '📚', EVENTO: '📅', MENSAJE: '✉️', SISTEMA: '⚙️', AVISO: '📣',
};

/** CU12 · Bandeja de notificaciones (la campana). */
@Component({
  selector: 'cv-notificaciones',
  imports: [DatePipe, RouterLink, Paginador, SiPuede],
  template: `
    <div class="cabecera">
      <h1>Notificaciones</h1>
      <div class="acciones">
        <a *siPuede="'AVISO_ENVIAR'" class="btn btn-primario" routerLink="/notificaciones/enviar">📣 Enviar aviso</a>
        <button class="btn" type="button" (click)="todas()">Marcar todas como leídas</button>
      </div>
    </div>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="bloque">
      @for (n of lista(); track n.idNotificacion) {
        <button class="noti" type="button" [class.nueva]="!n.leida" (click)="abrir(n)">
          <span class="ico">{{ icono[n.tipo] }}</span>
          <span class="txt">
            <strong>{{ n.titulo }}</strong>
            @if (n.contenido) { <span class="cont">{{ n.contenido }}</span> }
            <small class="apagado">{{ n.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}@if (n.idEmisor) { · de {{ personas.nombre(n.idEmisor) }} }</small>
          </span>
          @if (!n.leida) { <span class="punto" aria-label="Sin leer"></span> }
        </button>
      } @empty {
        <p class="vacio">{{ cargando() ? 'Cargando...' : 'No tienes notificaciones. 🎉' }}</p>
      }
    </div>
    <cv-paginador [pagina]="pagina()" [total]="totalPaginas()" (ir)="cargar($event)" />
  `,
  styles: `
    .noti { width: 100%; display: flex; gap: 14px; align-items: flex-start; text-align: left; background: #fff; border: 0; border-top: 1px solid #f0f0f0; padding: 14px 6px; font: inherit; cursor: pointer; }
    .noti:first-child { border-top: 0; }
    .noti:hover { background: #fafafa; }
    .noti.nueva { background: #fff8f7; }
    .ico { font-size: 1.4rem; }
    .txt { flex: 1; display: flex; flex-direction: column; gap: .15rem; }
    .cont { color: #444; font-size: .9rem; white-space: pre-wrap; }
    .punto { width: 10px; height: 10px; border-radius: 50%; background: var(--coral); margin-top: .4rem; }
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

  ngOnInit(): void {
    this.cargar(0);
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

  protected todas(): void {
    this.api.marcarTodas().subscribe({ next: () => this.cargar(this.pagina()), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrir(n: Notificacion): void {
    const ir = () => {
      const destino = this.destino(n);
      if (destino) void this.router.navigate(destino);
    };
    if (n.leida) return ir();
    this.api.marcarLeida(n.idNotificacion).subscribe({
      next: () => {
        this.lista.update((l) => l.map((x) => (x.idNotificacion === n.idNotificacion ? { ...x, leida: true } : x)));
        ir();
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  /** A dónde lleva cada notificación al hacer clic. */
  private destino(n: Notificacion): unknown[] | null {
    if (n.entidadTipo === 'PUBLICACION' && n.entidadId) return ['/publicaciones', n.entidadId];
    if (n.entidadTipo === 'COMENTARIO' && n.idComunidad) return ['/comunidades', n.idComunidad];
    if (n.tipo === 'MENSAJE') return ['/mensajes'];
    if (n.entidadTipo === 'SOLICITUD' && this.sesion.puede('SOLICITUDES_RESOLVER')) return ['/admin/solicitudes'];
    if (n.entidadTipo === 'USUARIO' && this.sesion.puede('USUARIOS_GESTIONAR')) return ['/admin/usuarios'];
    return n.idComunidad ? ['/comunidades', n.idComunidad] : null;
  }
}
