import { Component, inject, input, OnInit, signal } from '@angular/core';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Miembro, NOMBRE_ROL } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { iniciales } from '../../core/util/texto';

@Component({
  selector: 'cv-tab-miembros',
  template: `
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <h2>Miembros ({{ miembros().length }})</h2>
    <div class="tabla-scroll">
      <table class="tabla">
        <thead><tr><th>Persona</th><th>Rol</th><th>En la comunidad</th>@if (esAdmin) { <th></th> }</tr></thead>
        <tbody>
          @for (m of miembros(); track m.idUsuario) {
            <tr>
              <td><span class="av">{{ iniciales(m.nombres + ' ' + m.apellidos) }}</span> {{ m.nombres }} {{ m.apellidos }}</td>
              <td>{{ nombreRol[m.rol] }}</td>
              <td><span class="pill" [class.azul]="m.rolComunidad !== 'MIEMBRO'">{{ m.rolComunidad }}</span></td>
              @if (esAdmin) {
                <td class="numero">
                  @if (m.idUsuario !== sesion.sesion()?.idUsuario) { <button class="btn btn-chico btn-peligro" type="button" (click)="expulsar(m)">Expulsar</button> }
                </td>
              }
            </tr>
          } @empty {
            <tr><td colspan="4" class="vacio">Sin miembros.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `.av { display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #e0e0e0; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; margin-right: .5rem; }`,
})
export class TabMiembros implements OnInit {
  private readonly api = inject(ComunidadApi);
  protected readonly sesion = inject(SesionService);
  readonly idComunidad = input.required<number>();
  protected readonly miembros = signal<Miembro[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly nombreRol = NOMBRE_ROL;
  protected readonly iniciales = iniciales;
  protected readonly esAdmin = this.sesion.rol() === 'ADMIN';

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.miembros(this.idComunidad()).subscribe({ next: (m) => this.miembros.set(m), error: (e) => this.error.set(textoError(e)) });
  }

  protected expulsar(m: Miembro): void {
    if (!confirm(`¿Expulsar a ${m.nombres} ${m.apellidos} de la comunidad?`)) return;
    this.api.expulsar(this.idComunidad(), m.idUsuario).subscribe({ next: () => this.cargar(), error: (e) => this.error.set(textoError(e)) });
  }
}
