import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AcademicoApi } from '../../core/api/academico.api';
import { PermisoNota } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { Modal } from '../../shared/modal';

type Estado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

@Component({
  selector: 'cv-permisos-nota',
  imports: [DatePipe, Icono, Modal],
  template: `
    <h1>Permisos de notas</h1>
    <nav class="tabs">
      @for (e of estados; track e) { <button class="tab" [class.activa]="estado() === e" (click)="cambiar(e)">{{ nombre[e] }}</button> }
    </nav>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <div class="tabla-scroll">
      <table class="tabla">
        <thead><tr><th>Docente</th><th>Curso</th><th>Motivo</th><th>Fecha</th>@if (estado() === 'PENDIENTE') { <th class="der">Acción</th> } @else { <th>Respuesta</th> }</tr></thead>
        <tbody>
          @for (p of lista(); track p.idPermiso) {
            <tr>
              <td><strong>{{ p.docente }}</strong></td>
              <td>{{ p.curso }} <span class="apagado">· {{ p.grupo }}</span></td>
              <td class="motivo">{{ p.motivo }}</td>
              <td>{{ p.fechaSolicitud | date: 'dd/MM/yy h:mm a' }}</td>
              @if (estado() === 'PENDIENTE') {
                <td class="der"><div class="acciones">
                  <button class="btn btn-chico btn-exito" type="button" title="Aprobar" (click)="abrir(p, true)"><cv-icono nombre="check" [tamano]="15" /></button>
                  <button class="btn btn-chico btn-peligro" type="button" title="Rechazar" (click)="abrir(p, false)"><cv-icono nombre="cerrar" [tamano]="15" /></button>
                </div></td>
              } @else {
                <td>{{ p.respuesta || '—' }}@if (p.vigente) { <span class="pill">Vigente</span> }</td>
              }
            </tr>
          } @empty {
            <tr><td colspan="5" class="vacio">{{ cargando() ? 'Cargando...' : 'Sin solicitudes' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    @if (resolviendo(); as r) {
      <cv-modal [titulo]="r.aprobar ? 'Aprobar permiso' : 'Rechazar permiso'" (cerrar)="resolviendo.set(null)">
        <div class="tarjeta">
          <p class="apagado">{{ r.p.docente }} · {{ r.p.curso }}</p>
          <label for="resp">Respuesta</label>
          <textarea #resp id="resp" maxlength="500"></textarea>
          @if (r.aprobar) { <small class="ayuda">Vigente por 24 horas.</small> }
          <div class="botones"><button class="btn" type="button" (click)="resolviendo.set(null)">Cancelar</button>
            <button class="btn" [class.btn-exito]="r.aprobar" [class.btn-peligro]="!r.aprobar" type="button" (click)="resolver(r.p, r.aprobar, resp.value)">{{ r.aprobar ? 'Aprobar' : 'Rechazar' }}</button></div>
        </div>
      </cv-modal>
    }
  `,
  styles: `
    .der { text-align: right; }
    .acciones { display: inline-flex; gap: .3rem; }
    .acciones .btn { display: inline-flex; align-items: center; padding: .2rem .45rem; }
    .motivo { max-width: 320px; }
  `,
})
export class PermisosNota implements OnInit {
  private readonly api = inject(AcademicoApi);
  protected readonly estados: Estado[] = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
  protected readonly nombre: Record<Estado, string> = { PENDIENTE: 'Pendientes', APROBADO: 'Aprobados', RECHAZADO: 'Rechazados' };
  protected readonly estado = signal<Estado>('PENDIENTE');
  protected readonly lista = signal<PermisoNota[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly resolviendo = signal<{ p: PermisoNota; aprobar: boolean } | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiar(e: Estado): void {
    this.estado.set(e);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.permisosNota(this.estado()).subscribe({
      next: (l) => {
        this.lista.set(l);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected abrir(p: PermisoNota, aprobar: boolean): void {
    this.resolviendo.set({ p, aprobar });
  }

  protected resolver(p: PermisoNota, aprobar: boolean, respuesta: string): void {
    this.api.resolverPermisoNota(p.idPermiso, aprobar, respuesta.trim() || null).subscribe({
      next: () => {
        this.resolviendo.set(null);
        this.error.set(null);
        this.exito.set(aprobar ? 'Permiso aprobado.' : 'Permiso rechazado.');
        setTimeout(() => this.exito.set(null), 4000);
        this.cargar();
      },
      error: (e) => {
        this.resolviendo.set(null);
        this.error.set(textoError(e));
      },
    });
  }
}
