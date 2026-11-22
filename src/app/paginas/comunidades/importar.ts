import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { ComunidadImportada, ResultadoImportacion } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { Icono } from '../../shared/icono';
import { crearExcel, leerExcel } from '../../core/util/excel';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { forkJoin, take } from 'rxjs';

const COLUMNAS = ['nombre', 'descripcion', 'categoria', 'idioma', 'pueblo', 'visibilidad'] as const;
const MAX_FILAS = 200;

function separarLinea(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (comillas) {
      if (ch === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else actual += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) {
      campos.push(actual.trim());
      actual = '';
    } else actual += ch;
  }
  campos.push(actual.trim());
  return campos;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
}

export function leerCsv(texto: string): ComunidadImportada[] {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lineas.length) return [];
  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return filasAComunidades(lineas.map((l) => separarLinea(l, sep)));
}

export function filasAComunidades(filas: string[][]): ComunidadImportada[] {
  if (!filas.length) return [];
  const cabecera = filas[0].map(normalizar);
  const indice = Object.fromEntries(COLUMNAS.map((c) => [c, cabecera.indexOf(c)])) as Record<(typeof COLUMNAS)[number], number>;
  if (indice.nombre < 0 || indice.categoria < 0) throw new Error('El archivo debe tener al menos las columnas "nombre" y "categoria".');
  return filas.slice(1).map((v) => {
    const tomar = (c: (typeof COLUMNAS)[number]) => (indice[c] >= 0 ? (v[indice[c]] ?? '') : '');
    return {
      nombre: tomar('nombre'),
      descripcion: tomar('descripcion'),
      categoria: tomar('categoria'),
      idioma: tomar('idioma'),
      pueblo: tomar('pueblo'),
      visibilidad: tomar('visibilidad').toUpperCase() || 'PUBLICA',
    };
  });
}

@Component({
  selector: 'cv-importar-comunidades',
  imports: [EtiquetaPipe, AsyncPipe, RouterLink, Icono],
  template: `
    <a class="volver" routerLink="/comunidades"><cv-icono nombre="atras" [tamano]="16" /> Volver</a>
    <h1>Importar comunidades</h1>
    <p class="subtitulo-pagina">Excel (.xlsx) o CSV.</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }

    <section class="tarjeta tarjeta-plana pasos">
      <div class="paso">
        <span class="num">1</span>
        <div>
          <strong>Descarga la plantilla</strong>
          <p class="apagado">Columnas: <code>nombre</code> <b class="req">*</b>, <code>descripcion</code>, <code>categoria</code> <b class="req">*</b>, <code>idioma</code>, <code>pueblo</code>, <code>visibilidad</code> (PUBLICA o PRIVADA).</p>
          <button class="btn btn-chico" type="button" (click)="plantilla()"><cv-icono nombre="descargar" [tamano]="16" /> Descargar plantilla</button>
        </div>
      </div>
      <div class="paso">
        <span class="num">2</span>
        <div>
          <strong>Sube el archivo</strong>
          <p class="apagado">Máximo {{ maxFilas }} filas.</p>
          <label class="btn btn-chico subir"><cv-icono nombre="subir" [tamano]="16" /> Elegir Excel o CSV
            <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" (change)="elegir($any($event.target))" hidden />
          </label>
          @if (archivo()) { <span class="apagado"> {{ archivo() }}</span> }
        </div>
      </div>
      <details class="catalogos">
        <summary>Ver categorías, idiomas y pueblos disponibles</summary>
        <div class="tres-col">
          <div><b>Categorías</b><ul>@for (c of (categorias$ | async) ?? []; track c.idCategoria) { <li>{{ c.nombre }}</li> }</ul></div>
          <div><b>Idiomas</b><ul>@for (i of (idiomas$ | async) ?? []; track i.idIdioma) { <li>{{ i.nombre }}</li> }</ul></div>
          <div><b>Pueblos</b><ul>@for (p of (pueblos$ | async) ?? []; track p.idPueblo) { <li>{{ p.nombre }}</li> }</ul></div>
        </div>
      </details>
    </section>

    @if (filas().length) {
      <h2>Vista previa ({{ filas().length }} comunidades)</h2>
      <div class="tabla-scroll">
        <table class="tabla">
          <thead><tr><th>Fila</th><th>Nombre</th><th>Categoría</th><th>Idioma</th><th>Pueblo</th><th>Visibilidad</th><th>Resultado</th></tr></thead>
          <tbody>
            @for (f of filas(); track $index; let i = $index) {
              <tr>
                <td>{{ i + 2 }}</td>
                <td><strong>{{ f.nombre || '—' }}</strong>@if (f.descripcion) { <small class="desc">{{ f.descripcion }}</small> }</td>
                <td>{{ f.categoria || '—' }}</td>
                <td>{{ f.idioma || '—' }}</td>
                <td>{{ f.pueblo || '—' }}</td>
                <td>{{ f.visibilidad | etiqueta }}</td>
                <td>
                  @if (resultadoDe()[i + 2]; as r) {
                    <span class="pill" [class.riesgo]="!r.ok"><cv-icono [nombre]="r.ok ? 'check' : 'alerta'" [tamano]="14" /> {{ r.mensaje }}</span>
                  } @else { <span class="apagado">Pendiente</span> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (resultados().length) {
        <div class="exito" role="status">Se crearon {{ creadas() }} de {{ resultados().length }} comunidades.@if (creadas() < resultados().length) { Corrige las filas con error y vuelve a subirlas. }</div>
        <a class="btn btn-primario" routerLink="/comunidades">Ver comunidades</a>
      } @else {
        <div class="botones"><button class="btn" type="button" (click)="limpiar()">Cancelar</button>
          <button class="btn btn-primario" type="button" [disabled]="enviando()" (click)="importar()"><cv-icono nombre="subir" [tamano]="16" /> {{ enviando() ? 'Importando...' : 'Importar ' + filas().length + ' comunidades' }}</button></div>
      }
    }
  `,
  styles: `
    .pasos { display: flex; flex-direction: column; gap: 1.1rem; }
    .paso { display: flex; gap: .9rem; align-items: flex-start; }
    .paso p { margin: .2rem 0 .5rem; }
    .num { width: 30px; height: 30px; border-radius: 50%; background: var(--coral); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none; }
    .btn { display: inline-flex; align-items: center; gap: .3rem; }
    .subir { cursor: pointer; }
    code { background: var(--superficie-2); padding: 0 .3rem; border-radius: 4px; }
    .catalogos summary { cursor: pointer; color: var(--acento-texto-osc); font-weight: 600; }
    .tres-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: .6rem; font-size: .88rem; }
    .tres-col ul { margin: .3rem 0 0; padding-left: 1.1rem; max-height: 180px; overflow-y: auto; }
    .desc { display: block; color: var(--muted); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pill { display: inline-flex; align-items: center; gap: .25rem; }
  `,
})
export class ImportarComunidades {
  private readonly api = inject(ComunidadApi);
  private readonly catalogo = inject(CatalogoApi);
  protected readonly categorias$ = this.catalogo.categorias$;
  protected readonly idiomas$ = this.catalogo.idiomas$;
  protected readonly pueblos$ = this.catalogo.pueblos$;
  protected readonly maxFilas = MAX_FILAS;

  protected readonly archivo = signal<string | null>(null);
  protected readonly filas = signal<ComunidadImportada[]>([]);
  protected readonly resultados = signal<ResultadoImportacion[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultadoDe = computed(() => Object.fromEntries(this.resultados().map((r) => [r.fila, r])) as Record<number, ResultadoImportacion>);
  protected readonly creadas = computed(() => this.resultados().filter((r) => r.ok).length);

  protected elegir(input: HTMLInputElement): void {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    this.limpiar();
    this.archivo.set(f.name);
    const esExcel = /\.xlsx$/i.test(f.name);
    const lectura = esExcel ? f.arrayBuffer().then((b) => leerExcel(b)).then(filasAComunidades) : f.text().then(leerCsv);
    lectura
      .then((filas) => {
        if (!filas.length) return this.error.set('El archivo no tiene comunidades.');
        if (filas.length > MAX_FILAS) return this.error.set(`El archivo tiene ${filas.length} filas; el máximo es ${MAX_FILAS}.`);
        this.filas.set(filas);
      })
      .catch((e: unknown) => this.error.set(e instanceof Error ? e.message : 'No se pudo leer el archivo.'));
  }

  protected importar(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.api.importar(this.filas()).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.resultados.set(r);
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected limpiar(): void {
    this.archivo.set(null);
    this.filas.set([]);
    this.resultados.set([]);
    this.error.set(null);
  }

  protected plantilla(): void {
    forkJoin([this.categorias$.pipe(take(1)), this.idiomas$.pipe(take(1)), this.pueblos$.pipe(take(1))]).subscribe(([c, i, p]) => {
      const blob = crearExcel([
        ['nombre', 'descripcion', 'categoria', 'idioma', 'pueblo', 'visibilidad'],
        ['Docentes de Matemática de Puno', 'Espacio para compartir estrategias de enseñanza', c[0]?.nombre ?? '', i[0]?.nombre ?? '', p[0]?.nombre ?? '', 'PUBLICA'],
      ]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-comunidades.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }
}
