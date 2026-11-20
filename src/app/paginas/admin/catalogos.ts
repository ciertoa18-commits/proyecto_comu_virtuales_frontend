import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { TipoCatalogo } from '../../core/modelos';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { Icono, NombreIcono } from '../../shared/icono';
import { Modal } from '../../shared/modal';

interface Fila {
  id: number;
  nombre: string;
  detalle: string | null;
}

const INFO: Record<TipoCatalogo, { titulo: string; singular: string; icono: NombreIcono; campo: string; ayuda: string }> = {
  categorias: { titulo: 'Categorías', singular: 'categoría', icono: 'etiqueta', campo: 'Descripción', ayuda: 'Sirven para clasificar las comunidades.' },
  pueblos: { titulo: 'Pueblos originarios', singular: 'pueblo originario', icono: 'ubicacion', campo: 'Familia lingüística', ayuda: 'Pueblos indígenas u originarios a los que puede pertenecer una comunidad.' },
  idiomas: { titulo: 'Idiomas', singular: 'idioma', icono: 'idioma', campo: 'Código', ayuda: 'Lenguas que se pueden elegir como idioma dominante o segunda lengua.' },
};

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

@Component({
  selector: 'cv-catalogos',
  imports: [ReactiveFormsModule, Icono, Modal],
  template: `
    <div class="cabecera">
      <h1>Catálogos</h1>
      <button class="btn btn-primario" type="button" (click)="nuevo()"><cv-icono nombre="mas" [tamano]="16" /> Crear {{ info().singular }}</button>
    </div>
    <p class="subtitulo-pagina">Agrega las categorías, pueblos originarios e idiomas que se eligen al crear una comunidad.</p>
    <nav class="tabs">
      @for (t of tipos; track t) {
        <button class="tab" [class.activa]="tipo() === t" (click)="cambiar(t)"><cv-icono [nombre]="infoDe[t].icono" [tamano]="16" /> {{ infoDe[t].titulo }}</button>
      }
    </nav>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    @if (exito()) { <div class="exito" role="status">{{ exito() }}</div> }
    <p class="apagado">{{ info().ayuda }}</p>
    <label class="busca"><cv-icono nombre="buscar" />
      <input type="search" autocomplete="off" [placeholder]="'Buscar ' + info().titulo.toLowerCase() + '...'" [value]="texto()" (input)="texto.set($any($event.target).value)" />
    </label>
    <div class="tabla-scroll">
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>{{ info().campo }}</th><th class="der">Acciones</th></tr></thead>
        <tbody>
          @for (f of filtradas(); track f.id) {
            <tr>
              <td><strong>{{ f.nombre }}</strong></td>
              <td>{{ f.detalle ?? '—' }}</td>
              <td class="der"><div class="acciones">
                <button class="btn btn-chico" type="button" (click)="editar(f)"><cv-icono nombre="lapiz" [tamano]="16" /> Editar</button>
                <button class="btn btn-chico btn-peligro" type="button" (click)="eliminar(f)"><cv-icono nombre="basura" [tamano]="16" /> Eliminar</button>
              </div></td>
            </tr>
          } @empty {
            <tr><td colspan="3" class="vacio">{{ texto() ? 'Nada coincide con la búsqueda.' : 'Todavía no hay registros.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <p class="apagado">{{ filtradas().length }} de {{ filas().length }} registro(s).</p>

    @if (abierto()) {
      <cv-modal [titulo]="(editando() ? 'Editar ' : 'Crear ') + info().singular" (cerrar)="abierto.set(false)">
        @if (errorModal()) { <div class="alerta">{{ errorModal() }}</div> }
        <form class="tarjeta" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          <p class="ayuda">Los campos con <b class="req">*</b> son obligatorios.</p>
          <label for="cn">Nombre <b class="req">*</b></label>
          <input id="cn" formControlName="nombre" [attr.maxlength]="tipo() === 'idiomas' ? 60 : 100" />
          @if (err('nombre'); as m) { <small class="campo-error">{{ m }}</small> }
          <label for="cd">{{ info().campo }} @if (tipo() === 'idiomas') { <b class="req">*</b> } @else { (opcional) }</label>
          <input id="cd" formControlName="detalle" [attr.maxlength]="tipo() === 'idiomas' ? 10 : tipo() === 'pueblos' ? 100 : 500"
            [placeholder]="tipo() === 'idiomas' ? 'Ej.: qu, ay, cni' : tipo() === 'pueblos' ? 'Ej.: Arawak' : ''" />
          @if (err('detalle', tipo() === 'idiomas' ? 'Usa solo letras y guiones, por ejemplo qu o es-PE.' : undefined); as m) { <small class="campo-error">{{ m }}</small> }
          @if (tipo() === 'idiomas') { <small class="ayuda">Código corto de la lengua (ISO 639), por ejemplo qu para quechua.</small> }
          <div class="botones"><button class="btn" type="button" (click)="abierto.set(false)">Cancelar</button>
            <button class="btn btn-primario" type="submit" [disabled]="guardando()">Guardar</button></div>
        </form>
      </cv-modal>
    }
  `,
  styles: `
    .cabecera .btn, .acciones .btn, .tab { display: inline-flex; align-items: center; gap: .3rem; }
    .busca { display: flex; align-items: center; gap: .5rem; max-width: 420px; color: #777; margin: .6rem 0 1rem; }
    .busca input { flex: 1; }
    .der { text-align: right; }
    .acciones { display: flex; gap: .4rem; justify-content: flex-end; flex-wrap: wrap; }
  `,
})
export class Catalogos implements OnInit {
  private readonly api = inject(CatalogoApi);
  private readonly fb = inject(FormBuilder);

  readonly tab = input<string>();

  protected readonly tipos: TipoCatalogo[] = ['categorias', 'pueblos', 'idiomas'];
  protected readonly infoDe = INFO;
  protected readonly tipo = signal<TipoCatalogo>('categorias');
  protected readonly info = computed(() => INFO[this.tipo()]);
  protected readonly texto = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly abierto = signal(false);
  protected readonly editando = signal<Fila | null>(null);
  protected readonly guardando = signal(false);

  private readonly categorias = toSignal(this.api.categorias$, { initialValue: [] });
  private readonly pueblos = toSignal(this.api.pueblos$, { initialValue: [] });
  private readonly idiomas = toSignal(this.api.idiomas$, { initialValue: [] });

  protected readonly filas = computed<Fila[]>(() => {
    switch (this.tipo()) {
      case 'categorias':
        return this.categorias().map((c) => ({ id: c.idCategoria, nombre: c.nombre, detalle: c.descripcion }));
      case 'pueblos':
        return this.pueblos().map((p) => ({ id: p.idPueblo, nombre: p.nombre, detalle: p.familiaLinguistica }));
      default:
        return this.idiomas().map((i) => ({ id: i.idIdioma, nombre: i.nombre, detalle: i.codigo }));
    }
  });
  protected readonly filtradas = computed(() => {
    const q = sinTildes(this.texto().trim());
    return q ? this.filas().filter((f) => sinTildes(f.nombre).includes(q) || sinTildes(f.detalle ?? '').includes(q)) : this.filas();
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    detalle: [''],
  });

  ngOnInit(): void {
    const t = this.tab();
    if (t === 'pueblos' || t === 'idiomas' || t === 'categorias') this.tipo.set(t);
  }

  protected err(c: 'nombre' | 'detalle', formato?: string): string | null {
    const servidor = this.delServidor();
    return (c === 'detalle' ? (servidor['codigo'] ?? servidor['descripcion'] ?? servidor['familiaLinguistica']) : servidor[c]) ?? errorCampo(this.form.controls[c], formato);
  }

  protected cambiar(t: TipoCatalogo): void {
    this.tipo.set(t);
    this.texto.set('');
    this.error.set(null);
    this.exito.set(null);
  }

  private abrir(f: Fila | null): void {
    const idioma = this.tipo() === 'idiomas';
    this.form.reset({ nombre: f?.nombre ?? '', detalle: f?.detalle ?? '' });
    this.form.controls.detalle.setValidators(idioma ? [Validators.required, Validators.maxLength(10), Validators.pattern(/^[a-zA-Z-]+$/)] : Validators.maxLength(500));
    this.form.controls.detalle.updateValueAndValidity();
    this.errorModal.set(null);
    this.delServidor.set({});
    this.editando.set(f);
    this.abierto.set(true);
  }

  protected nuevo(): void {
    this.abrir(null);
  }

  protected editar(f: Fila): void {
    this.abrir(f);
  }

  protected guardar(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { nombre, detalle } = this.form.getRawValue();
    const n = nombre.trim();
    const d = detalle.trim();
    const id = this.editando()?.id;
    let peticion: Observable<unknown>;
    switch (this.tipo()) {
      case 'categorias': {
        const datos = { nombre: n, descripcion: d || null };
        peticion = id ? this.api.editarCategoria(id, datos) : this.api.crearCategoria(datos);
        break;
      }
      case 'pueblos': {
        const datos = { nombre: n, familiaLinguistica: d || null };
        peticion = id ? this.api.editarPueblo(id, datos) : this.api.crearPueblo(datos);
        break;
      }
      default: {
        const datos = { codigo: d.toLowerCase(), nombre: n };
        peticion = id ? this.api.editarIdioma(id, datos) : this.api.crearIdioma(datos);
      }
    }
    this.guardando.set(true);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.abierto.set(false);
        this.error.set(null);
        this.exito.set(`${this.info().singular.charAt(0).toUpperCase() + this.info().singular.slice(1)} "${n}" ${id ? 'actualizado(a)' : 'creado(a)'}.`);
      },
      error: (e) => {
        this.guardando.set(false);
        this.delServidor.set(erroresPorCampo(e));
        this.errorModal.set(textoError(e));
      },
    });
  }

  protected eliminar(f: Fila): void {
    if (!confirm(`¿Eliminar "${f.nombre}"? Solo se puede si ninguna comunidad o usuario lo usa.`)) return;
    this.api.eliminar(this.tipo(), f.id).subscribe({
      next: () => {
        this.error.set(null);
        this.exito.set(`"${f.nombre}" fue eliminado.`);
      },
      error: (e) => {
        this.exito.set(null);
        this.error.set(textoError(e));
      },
    });
  }
}
