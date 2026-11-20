import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { AdminApi } from '../../core/api/admin.api';
import { NOMBRE_ROL, UsuarioDetalle, UsuarioResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, textoError } from '../../core/util/errores';
import { iniciales } from '../../core/util/texto';
import { Icono } from '../../shared/icono';

const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';

@Component({
  selector: 'cv-recuperar-cuenta',
  imports: [DatePipe, ReactiveFormsModule, Icono],
  template: `
    <h1>Recuperar cuenta</h1>
    <p class="subtitulo-pagina">Busca a la persona, revisa el estado de su cuenta y asígnale una contraseña nueva o quítale el bloqueo.</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }

    <div class="rejilla">
      <section class="bloque">
        <label class="busca"><cv-icono nombre="buscar" />
          <input type="search" autocomplete="off" placeholder="Nombre, apellido o correo..." (input)="busqueda.next($any($event.target).value)" />
        </label>
        <ul class="resultados">
          @for (u of resultados(); track u.idUsuario) {
            <li><button type="button" [class.activo]="elegido()?.idUsuario === u.idUsuario" (click)="elegir(u)">
              <span class="av">{{ iniciales(u.nombres + ' ' + u.apellidos) }}</span>
              <span class="datos"><strong>{{ u.nombres }} {{ u.apellidos }}</strong><small>{{ u.correo }}</small></span>
              @if (u.bloqueado) { <span class="pill riesgo">Bloqueado</span> } @else if (u.estado !== 'ACTIVO') { <span class="pill inactivo">{{ u.estado === 'INACTIVO' ? 'Inactivo' : 'Pendiente' }}</span> }
            </button></li>
          } @empty {
            <li class="vacio">{{ buscando() ? 'Buscando...' : 'No hay resultados.' }}</li>
          }
        </ul>
      </section>

      <section class="bloque">
        @if (elegido(); as d) {
          <div class="cab">
            <span class="av grande">{{ iniciales(d.nombres + ' ' + d.apellidos) }}</span>
            <div><strong>{{ d.nombres }} {{ d.apellidos }}</strong><small>{{ nombreRol[d.rol] }}</small></div>
          </div>
          <dl class="estado">
            <div><dt>Correo institucional</dt><dd>{{ d.correo }}</dd></div>
            <div><dt>Gmail personal</dt><dd>{{ d.correoRecuperacion ?? 'No registrado' }}</dd></div>
            <div><dt>Estado</dt><dd>{{ d.estado === 'ACTIVO' ? 'Activa' : d.estado === 'INACTIVO' ? 'Inactiva' : 'Pendiente de aprobación' }}</dd></div>
            <div><dt>Intentos fallidos</dt><dd>{{ d.intentosFallidos ?? 0 }}</dd></div>
            <div><dt>Bloqueo</dt><dd>{{ d.bloqueado ? 'Hasta ' + (d.bloqueadoHasta | date: 'dd/MM/yyyy HH:mm') : 'Sin bloqueo' }}</dd></div>
          </dl>

          <div class="acciones">
            @if (d.bloqueado || (d.intentosFallidos ?? 0) > 0) {
              <button class="btn" type="button" (click)="desbloquear(d)"><cv-icono nombre="desbloquear" [tamano]="16" /> Quitar bloqueo</button>
            }
            @if (d.estado === 'INACTIVO' && d.idUsuario !== sesion.sesion()?.idUsuario) {
              <button class="btn btn-exito" type="button" (click)="reactivar(d)"><cv-icono nombre="recargar" [tamano]="16" /> Reactivar cuenta</button>
            }
          </div>

          <form class="tarjeta clave" [formGroup]="form" (ngSubmit)="cambiar(d)" novalidate>
            <h2>Asignar contraseña nueva</h2>
            <label for="nueva">Contraseña nueva <b class="req">*</b></label>
            <div class="con-botones">
              <input id="nueva" [type]="ver() ? 'text' : 'password'" autocomplete="new-password" formControlName="nueva" />
              <button class="btn btn-chico" type="button" [title]="ver() ? 'Ocultar' : 'Mostrar'" (click)="ver.set(!ver())"><cv-icono nombre="ojo" [tamano]="16" /></button>
              <button class="btn btn-chico" type="button" (click)="generar()">Generar</button>
            </div>
            @if (errorCampo(form.controls.nueva); as m) { <small class="campo-error">{{ m }}</small> } @else { <small class="ayuda">Mínimo 12 caracteres. También se quita el bloqueo por intentos fallidos.</small> }
            <div class="botones"><button class="btn btn-primario" type="submit"><cv-icono nombre="llave" [tamano]="16" /> Guardar contraseña</button></div>
          </form>
        } @else {
          <p class="vacio">Elige a una persona de la lista para ver su cuenta.</p>
        }
      </section>
    </div>
  `,
  styles: `
    .rejilla { display: grid; grid-template-columns: minmax(260px, 1fr) 2fr; gap: 1.2rem; align-items: start; }
    @media (max-width: 860px) { .rejilla { grid-template-columns: 1fr; } }
    .busca { display: flex; align-items: center; gap: .5rem; color: #777; margin-bottom: .6rem; }
    .busca input { flex: 1; }
    .resultados { list-style: none; margin: 0; padding: 0; max-height: 460px; overflow-y: auto; }
    .resultados button { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .55rem .6rem; border: 0; border-radius: 8px; background: none; font: inherit; text-align: left; cursor: pointer; }
    .resultados button:hover { background: #f5f5f5; }
    .resultados button.activo { background: var(--coral-claro); }
    .datos { flex: 1; min-width: 0; }
    .datos small, .cab small { display: block; color: #888; overflow: hidden; text-overflow: ellipsis; }
    .av { width: 34px; height: 34px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: .72rem; color: #555; flex: none; }
    .av.grande { width: 52px; height: 52px; font-size: 1rem; background: var(--coral-claro); color: var(--coral-osc); }
    .cab { display: flex; align-items: center; gap: .8rem; margin-bottom: 1rem; }
    .cab strong { font-size: 1.05rem; }
    .estado { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .7rem 1.2rem; margin: 0 0 1rem; }
    .estado dt { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .03em; }
    .estado dd { margin: .15rem 0 0; font-weight: 600; word-break: break-word; }
    .acciones { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .btn { display: inline-flex; align-items: center; gap: .3rem; }
    .clave h2 { font-size: 1rem; margin: 0 0 .6rem; }
    .con-botones { display: flex; gap: .4rem; }
    .con-botones input { flex: 1; }
  `,
})
export class RecuperarCuenta implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sesion = inject(SesionService);
  protected readonly nombreRol = NOMBRE_ROL;
  protected readonly iniciales = iniciales;
  protected readonly errorCampo = errorCampo;

  protected readonly busqueda = new Subject<string>();
  protected readonly resultados = signal<UsuarioResumen[]>([]);
  protected readonly buscando = signal(true);
  protected readonly elegido = signal<UsuarioDetalle | null>(null);
  protected readonly ver = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    nueva: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
  });

  ngOnInit(): void {
    this.busqueda
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.buscando.set(true);
          return this.api.usuarios({ q: q.trim(), size: 10 }).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => {
        this.buscando.set(false);
        this.resultados.set(r?.content ?? []);
      });
    this.busqueda.next('');
  }

  protected elegir(u: UsuarioResumen): void {
    this.exito.set(null);
    this.error.set(null);
    this.form.reset();
    this.ver.set(false);
    this.api.detalle(u.idUsuario).subscribe({ next: (d) => this.elegido.set(d), error: (e) => this.error.set(textoError(e)) });
  }

  protected generar(): void {
    const valores = new Uint32Array(14);
    crypto.getRandomValues(valores);
    const clave = Array.from(valores, (v) => CARACTERES[v % CARACTERES.length]).join('');
    this.form.controls.nueva.setValue(clave);
    this.form.controls.nueva.markAsTouched();
    this.ver.set(true);
  }

  protected desbloquear(d: UsuarioDetalle): void {
    this.api.desbloquear(d.idUsuario).subscribe({
      next: (n) => this.listo(n, `Se quitó el bloqueo de ${n.nombres}. Ya puede intentar ingresar de nuevo.`),
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected reactivar(d: UsuarioDetalle): void {
    this.api.cambiarEstado(d.idUsuario, 'ACTIVO').subscribe({
      next: () => this.recargar(d.idUsuario, `La cuenta de ${d.nombres} está activa otra vez.`),
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected cambiar(d: UsuarioDetalle): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.api.nuevaPassword(d.idUsuario, this.form.getRawValue().nueva).subscribe({
      next: () => {
        this.form.reset();
        this.ver.set(false);
        this.recargar(d.idUsuario, `Contraseña de ${d.nombres} cambiada. Compártela por un medio seguro.`);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  private recargar(id: number, mensaje: string): void {
    this.api.detalle(id).subscribe({ next: (n) => this.listo(n, mensaje), error: (e) => this.error.set(textoError(e)) });
  }

  private listo(d: UsuarioDetalle, mensaje: string): void {
    this.error.set(null);
    this.exito.set(mensaje);
    this.elegido.set(d);
    this.resultados.update((l) => l.map((u) => (u.idUsuario === d.idUsuario ? { ...u, estado: d.estado, bloqueado: d.bloqueado } : u)));
  }
}
