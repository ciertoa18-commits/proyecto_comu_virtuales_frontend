import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Comunidad, MiComunidad } from '../../core/modelos';
import { textoError } from '../../core/util/errores';
import { portada } from '../../core/util/texto';
import { ImagenArchivo } from '../../shared/imagen-archivo';
import { Paginador } from '../../shared/paginador';
import { SiPuede } from '../../shared/si-puede';

@Component({
  selector: 'cv-lista-comunidades',
  imports: [AsyncPipe, RouterLink, ImagenArchivo, Paginador, SiPuede],
  templateUrl: './lista.html',
})
export class ListaComunidades implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly catalogo = inject(CatalogoApi);
  protected readonly categorias$ = this.catalogo.categorias$;
  protected readonly idiomas$ = this.catalogo.idiomas$;
  protected readonly portada = portada;

  protected readonly comunidades = signal<Comunidad[]>([]);
  protected readonly mias = signal<MiComunidad[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly soloMias = signal(false);
  private filtro: { q?: string; categoria?: number | null; idioma?: number | null } = {};

  protected readonly estadoDe = computed(() => {
    const m: Record<number, MiComunidad> = {};
    for (const x of this.mias()) m[x.idComunidad] = x;
    return m;
  });
  protected readonly visibles = computed(() =>
    this.soloMias() ? this.comunidades().filter((c) => this.estadoDe()[c.idComunidad]?.estado === 'MIEMBRO') : this.comunidades(),
  );

  ngOnInit(): void {
    this.api.mias().subscribe({ next: (m) => this.mias.set(m), error: () => undefined });
    this.cargar(0);
  }

  protected cargar(p: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ ...this.filtro, page: p, size: this.soloMias() ? 100 : 12 }).subscribe({
      next: (r) => {
        this.comunidades.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(this.soloMias() ? 1 : r.page.totalPages);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected buscar(q: string, categoria: string, idioma: string): void {
    this.filtro = { q: q.trim(), categoria: categoria ? +categoria : null, idioma: idioma ? +idioma : null };
    this.cargar(0);
  }

  protected verMias(v: boolean): void {
    this.soloMias.set(v);
    this.cargar(0);
  }
}
