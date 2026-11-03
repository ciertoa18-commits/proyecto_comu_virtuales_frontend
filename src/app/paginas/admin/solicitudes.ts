import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Comunidad, Solicitud } from '../../core/modelos';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { Modal } from '../../shared/modal';
import { Paginador } from '../../shared/paginador';

/** Solicitudes de ingreso a comunidades privadas (aprobar o rechazar con motivo). */
@Component({
  selector: 'cv-solicitudes',
  imports: [DatePipe, RouterLink, Modal, Paginador],
  template: `
    <h1>Solicitudes de ingreso</h1>
    <p class="subtitulo-pagina">Personas que quieren entrar a una comunidad privada.</p>
    <nav class="tabs">
      @for (e of estados; track e) { <button class="tab" [class.activa]="estado() === e" (click)="cambiar(e)">{{ e }}</button> }
    </nav>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <div class="bloque">
      @for (s of lista(); track s.idSolicitud) {
        <div class="fila">
          <div>
            <strong>{{ personas.nombre(s.idUsuario) }}</strong> quiere entrar a
            <a [routerLink]="['/comunidades', s.idComunidad]">{{ nombreComunidad()[s.idComunidad] ?? 'la comunidad #' + s.idComunidad }}</a>
            <div class="apagado">{{ s.fechaSolicitud | date: 'dd/MM/yyyy HH:mm' }}</div>
            @if (s.mensaje) { <p class="msj">“{{ s.mensaje }}”</p> }
            @if (s.motivoRechazo) { <p class="msj">Motivo: {{ s.motivoRechazo }}</p> }
          </div>
          @if (s.estado === 'PENDIENTE') {
            <div class="acciones">
              <button class="btn btn-chico btn-exito" type="button" (click)="resolver(s, true, null)">✓ Aprobar</button>
              <button class="btn btn-chico btn-peligro" type="button" (click)="rechazando.set(s)">✗ Rechazar</button>
            </div>
          }
        </div>
      } @empty { <p class="vacio">No hay solicitudes {{ estado().toLowerCase() }}s.</p> }
    </div>
    <cv-paginador [pagina]="pagina()" [total]="totalPaginas()" (ir)="cargar($event)" />
    @if (rechazando(); as s) {
      <cv-modal titulo="Rechazar solicitud" (cerrar)="rechazando.set(null)">
        <div class="tarjeta">
          <label for="mo">Motivo (lo verá la persona)</label><textarea #mo id="mo" maxlength="500"></textarea>
          <div class="botones"><button class="btn" type="button" (click)="rechazando.set(null)">Cancelar</button>
            <button class="btn btn-peligro" type="button" (click)="resolver(s, false, mo.value)">Rechazar</button></div>
        </div>
      </cv-modal>
    }
  `,
  styles: `.msj { margin: .3rem 0 0; color: #444; font-style: italic; }`,
})
export class Solicitudes implements OnInit {
  private readonly api = inject(ComunidadApi);
  protected readonly personas = inject(PersonasService);
  protected readonly estados = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
  protected readonly estado = signal('PENDIENTE');
  protected readonly lista = signal<Solicitud[]>([]);
  protected readonly comunidades = signal<Comunidad[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly rechazando = signal<Solicitud | null>(null);
  protected readonly nombreComunidad = computed(() => Object.fromEntries(this.comunidades().map((c) => [c.idComunidad, c.nombre])) as Record<number, string>);

  ngOnInit(): void {
    this.api.listar({ size: 100 }).subscribe({ next: (p) => this.comunidades.set(p.content), error: () => undefined });
    this.cargar(0);
  }

  protected cambiar(e: string): void {
    this.estado.set(e);
    this.cargar(0);
  }

  protected cargar(p: number): void {
    this.api.solicitudes(this.estado(), p).subscribe({
      next: (r) => {
        this.lista.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected resolver(s: Solicitud, aprobar: boolean, motivo: string | null): void {
    this.api.resolver(s.idSolicitud, aprobar, motivo?.trim() || null).subscribe({
      next: () => {
        this.rechazando.set(null);
        this.exito.set(aprobar ? 'Solicitud aprobada: ya es miembro.' : 'Solicitud rechazada.');
        this.cargar(this.pagina());
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
