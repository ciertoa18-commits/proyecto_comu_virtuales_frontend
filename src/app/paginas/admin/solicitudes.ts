import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Comunidad, Solicitud } from '../../core/modelos';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { Modal } from '../../shared/modal';
import { Paginador } from '../../shared/paginador';

type Estado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

@Component({
  selector: 'cv-solicitudes',
  imports: [DatePipe, RouterLink, Icono, Modal, Paginador],
  template: `
    <h1>Solicitudes de ingreso</h1>
    <p class="subtitulo-pagina">Personas que quieren entrar a una comunidad privada.</p>
    <nav class="tabs">
      @for (e of estados; track e) { <button class="tab" [class.activa]="estado() === e" (click)="cambiar(e)">{{ nombreEstado[e] }}</button> }
    </nav>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <div class="filtros">
      <label class="busca"><cv-icono nombre="buscar" />
        <input type="search" autocomplete="off" placeholder="Buscar por persona, correo o comunidad..." [value]="texto()" (input)="buscar($any($event.target).value)" />
      </label>
      <span class="apagado">{{ total() }} solicitud(es)</span>
    </div>
    <div class="bloque">
      @for (s of lista(); track s.idSolicitud) {
        <div class="fila">
          <div>
            <strong>{{ personas.nombre(s.idUsuario) }}</strong> quiere entrar a
            <a [routerLink]="['/comunidades', s.idComunidad]">{{ nombreComunidad()[s.idComunidad] ?? 'la comunidad #' + s.idComunidad }}</a>
            <div class="apagado">{{ s.fechaSolicitud | date: 'dd/MM/yyyy HH:mm' }}</div>
            @if (s.mensaje) { <p class="msj">“{{ s.mensaje }}”</p> }
            @if (s.motivoRechazo) { <p class="msj"><b>Motivo:</b> {{ s.motivoRechazo }}</p> }
          </div>
          @if (s.estado === 'PENDIENTE') {
            <div class="acciones">
              <button class="btn btn-chico btn-exito" type="button" [disabled]="enCurso()" (click)="abrir(s, true)"><cv-icono nombre="check" [tamano]="16" /> Aceptar</button>
              <button class="btn btn-chico btn-peligro" type="button" [disabled]="enCurso()" (click)="abrir(s, false)"><cv-icono nombre="cerrar" [tamano]="16" /> Rechazar</button>
            </div>
          }
        </div>
      } @empty { <p class="vacio">{{ cargando() ? 'Cargando...' : texto() ? 'Ninguna solicitud coincide con la búsqueda.' : 'No hay solicitudes ' + nombreEstado[estado()].toLowerCase() + '.' }}</p> }
    </div>
    <cv-paginador [pagina]="pagina()" [total]="totalPaginas()" (ir)="cargar($event)" />
    @if (resolviendo(); as r) {
      <cv-modal [titulo]="r.aprobar ? 'Aceptar solicitud' : 'Rechazar solicitud'" (cerrar)="resolviendo.set(null)">
        <div class="tarjeta">
          <p class="apagado">{{ personas.nombre(r.s.idUsuario) }} · {{ nombreComunidad()[r.s.idComunidad] ?? 'Comunidad #' + r.s.idComunidad }}</p>
          <label for="mo">Motivo @if (r.aprobar) { (opcional) } @else { <b class="req">*</b> }</label>
          <textarea #mo id="mo" maxlength="500" [placeholder]="r.aprobar ? 'Ejemplo: cumple con el perfil de la comunidad' : 'Ejemplo: la comunidad es solo para docentes de la región'"></textarea>
          <small class="ayuda">La persona verá este motivo en su notificación.</small>
          @if (faltaMotivo()) { <small class="campo-error">Escribe el motivo del rechazo.</small> }
          <div class="botones"><button class="btn" type="button" (click)="resolviendo.set(null)">Cancelar</button>
            <button class="btn" [class.btn-exito]="r.aprobar" [class.btn-peligro]="!r.aprobar" type="button" [disabled]="enCurso()" (click)="resolver(r.s, r.aprobar, mo.value)">{{ r.aprobar ? 'Aceptar' : 'Rechazar' }}</button></div>
        </div>
      </cv-modal>
    }
  `,
  styles: `
    .msj { margin: .3rem 0 0; color: #444; }
    .filtros { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin: .8rem 0; }
    .busca { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 240px; max-width: 480px; color: #777; }
    .busca input { flex: 1; }
    .acciones .btn { display: inline-flex; align-items: center; gap: .3rem; }
  `,
})
export class Solicitudes implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly personas = inject(PersonasService);
  protected readonly estados: Estado[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
  protected readonly nombreEstado: Record<Estado, string> = { PENDIENTE: 'Pendientes', APROBADA: 'Aceptadas', RECHAZADA: 'Rechazadas' };
  protected readonly estado = signal<Estado>('PENDIENTE');
  protected readonly texto = signal('');
  protected readonly lista = signal<Solicitud[]>([]);
  protected readonly comunidades = signal<Comunidad[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly enCurso = signal(false);
  protected readonly faltaMotivo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly resolviendo = signal<{ s: Solicitud; aprobar: boolean } | null>(null);
  protected readonly nombreComunidad = computed(() => Object.fromEntries(this.comunidades().map((c) => [c.idComunidad, c.nombre])) as Record<number, string>);
  private readonly busqueda = new Subject<string>();

  ngOnInit(): void {
    this.api.listar({ size: 100 }).subscribe({ next: (p) => this.comunidades.set(p.content), error: () => undefined });
    this.busqueda.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.texto.set(q);
      this.cargar(0);
    });
    this.cargar(0);
  }

  protected buscar(q: string): void {
    this.busqueda.next(q.trim());
  }

  protected cambiar(e: Estado): void {
    this.estado.set(e);
    this.exito.set(null);
    this.cargar(0);
  }

  protected cargar(p: number): void {
    this.cargando.set(true);
    this.api.solicitudes(this.estado(), p, this.texto()).subscribe({
      next: (r) => {
        this.lista.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
        this.total.set(r.page.totalElements);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected abrir(s: Solicitud, aprobar: boolean): void {
    this.faltaMotivo.set(false);
    this.resolviendo.set({ s, aprobar });
  }

  protected resolver(s: Solicitud, aprobar: boolean, motivo: string): void {
    const texto = motivo.trim();
    if (!aprobar && !texto) return this.faltaMotivo.set(true);
    this.enCurso.set(true);
    this.api.resolver(s.idSolicitud, aprobar, texto || null).subscribe({
      next: () => {
        this.enCurso.set(false);
        this.resolviendo.set(null);
        this.error.set(null);
        this.exito.set(aprobar ? 'Solicitud aceptada: ya es miembro de la comunidad.' : 'Solicitud rechazada.');
        this.lista.update((l) => l.filter((x) => x.idSolicitud !== s.idSolicitud));
        this.cargar(this.pagina());
      },
      error: (e) => {
        this.enCurso.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
