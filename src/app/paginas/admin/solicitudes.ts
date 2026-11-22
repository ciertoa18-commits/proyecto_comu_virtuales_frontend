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
    <nav class="tabs">
      @for (e of estados; track e) { <button class="tab" [class.activa]="estado() === e" (click)="cambiar(e)">{{ nombreEstado[e] }}</button> }
    </nav>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <div class="barra">
      <label class="busca"><cv-icono nombre="buscar" />
        <input type="search" autocomplete="off" placeholder="Buscar persona o comunidad" [value]="texto()" (input)="buscar($any($event.target).value)" />
      </label>
      <label class="filas">Filas
        <select (change)="cambiarTamano(+$any($event.target).value)">
          @for (t of tamanos; track t) { <option [value]="t" [selected]="t === tamano()">{{ t }}</option> }
        </select>
      </label>
      <span class="apagado">{{ total() }} en total</span>
    </div>
    <div class="tabla-scroll">
      <table class="tabla hoja">
        <thead>
          <tr><th class="num">#</th><th>Persona</th><th>Comunidad</th><th>Fecha</th><th>Mensaje</th>@if (estado() !== 'PENDIENTE') { <th>Motivo</th> }@if (estado() === 'PENDIENTE') { <th class="der">Acción</th> }</tr>
        </thead>
        <tbody>
          @for (s of lista(); track s.idSolicitud; let i = $index) {
            <tr>
              <td class="num">{{ pagina() * tamano() + i + 1 }}</td>
              <td><strong>{{ personas.nombre(s.idUsuario) }}</strong></td>
              <td><a [routerLink]="['/comunidades', s.idComunidad]">{{ nombreComunidad()[s.idComunidad] ?? '#' + s.idComunidad }}</a></td>
              <td class="fecha">{{ s.fechaSolicitud | date: 'dd/MM/yy h:mm a' }}</td>
              <td class="msj" [title]="s.mensaje ?? ''">{{ s.mensaje || '—' }}</td>
              @if (estado() !== 'PENDIENTE') { <td class="msj" [title]="s.motivoRechazo ?? ''">{{ s.motivoRechazo || '—' }}</td> }
              @if (estado() === 'PENDIENTE') {
                <td class="der"><div class="acciones">
                  <button class="btn btn-chico btn-exito" type="button" title="Aceptar" [disabled]="enCurso()" (click)="abrir(s, true)"><cv-icono nombre="check" [tamano]="15" /></button>
                  <button class="btn btn-chico btn-peligro" type="button" title="Rechazar" [disabled]="enCurso()" (click)="abrir(s, false)"><cv-icono nombre="cerrar" [tamano]="15" /></button>
                </div></td>
              }
            </tr>
          } @empty {
            <tr><td colspan="6" class="vacio">{{ cargando() ? 'Cargando...' : 'Sin resultados' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <cv-paginador [pagina]="pagina()" [total]="totalPaginas()" (ir)="cargar($event)" />
    @if (resolviendo(); as r) {
      <cv-modal [titulo]="r.aprobar ? 'Aceptar solicitud' : 'Rechazar solicitud'" (cerrar)="resolviendo.set(null)">
        <div class="tarjeta">
          <p class="apagado">{{ personas.nombre(r.s.idUsuario) }} · {{ nombreComunidad()[r.s.idComunidad] ?? 'Comunidad #' + r.s.idComunidad }}</p>
          <label for="mo">Motivo @if (!r.aprobar) { <b class="req">*</b> }</label>
          <textarea #mo id="mo" maxlength="500"></textarea>
          @if (faltaMotivo()) { <small class="campo-error">Escribe el motivo.</small> }
          <div class="botones"><button class="btn" type="button" (click)="resolviendo.set(null)">Cancelar</button>
            <button class="btn" [class.btn-exito]="r.aprobar" [class.btn-peligro]="!r.aprobar" type="button" [disabled]="enCurso()" (click)="resolver(r.s, r.aprobar, mo.value)">{{ r.aprobar ? 'Aceptar' : 'Rechazar' }}</button></div>
        </div>
      </cv-modal>
    }
  `,
  styles: `
    .barra { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin: .8rem 0; }
    .busca { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 220px; max-width: 420px; color: var(--muted); }
    .busca input { flex: 1; }
    .filas { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--muted); }
    .filas select { width: auto; }
    .hoja { font-size: .86rem; }
    .hoja th, .hoja td { padding: .4rem .6rem; border: 1px solid var(--line); white-space: nowrap; }
    .hoja thead th { background: var(--superficie-2); position: sticky; top: 0; }
    .hoja tbody tr:nth-child(even) { background: var(--superficie-2); }
    .hoja tbody tr:hover { background: var(--coral-claro); }
    .num { width: 3rem; text-align: right; color: var(--muted); }
    .msj { max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
    .der { text-align: right; }
    .acciones { display: inline-flex; gap: .3rem; }
    .acciones .btn { display: inline-flex; align-items: center; padding: .2rem .45rem; }
  `,
})
export class Solicitudes implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly personas = inject(PersonasService);
  protected readonly estados: Estado[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
  protected readonly nombreEstado: Record<Estado, string> = { PENDIENTE: 'Pendientes', APROBADA: 'Aceptadas', RECHAZADA: 'Rechazadas' };
  protected readonly tamanos = [10, 20, 50];
  protected readonly tamano = signal(10);
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
  private aviso?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearTimeout(this.aviso));
    this.api.listar({ size: 100 }).subscribe({ next: (p) => this.comunidades.set(p.content), error: () => undefined });
    this.busqueda.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.texto.set(q);
      this.cargar(0);
    });
    this.cargar(0);
  }

  private avisar(tipo: 'exito' | 'error', msg: string): void {
    clearTimeout(this.aviso);
    this.exito.set(tipo === 'exito' ? msg : null);
    this.error.set(tipo === 'error' ? msg : null);
    this.aviso = setTimeout(() => {
      this.exito.set(null);
      this.error.set(null);
    }, 4000);
  }

  protected buscar(q: string): void {
    this.busqueda.next(q.trim());
  }

  protected cambiar(e: Estado): void {
    this.estado.set(e);
    this.cargar(0);
  }

  protected cambiarTamano(t: number): void {
    this.tamano.set(t);
    this.cargar(0);
  }

  protected cargar(p: number): void {
    this.cargando.set(true);
    this.api.solicitudes(this.estado(), p, this.texto(), this.tamano()).subscribe({
      next: (r) => {
        this.lista.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
        this.total.set(r.page.totalElements);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisar('error', textoError(e));
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
        this.avisar('exito', aprobar ? 'Solicitud aceptada.' : 'Solicitud rechazada.');
        this.lista.update((l) => l.filter((x) => x.idSolicitud !== s.idSolicitud));
        this.cargar(this.pagina());
      },
      error: (e) => {
        this.enCurso.set(false);
        this.avisar('error', textoError(e));
      },
    });
  }
}
