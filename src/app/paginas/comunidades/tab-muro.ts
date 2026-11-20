import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Archivo, VistaPublicacion } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { iniciales, LIMITE_ARCHIVO } from '../../core/util/texto';
import { BotonDescarga } from '../../shared/boton-descarga';
import { Paginador } from '../../shared/paginador';
import { Icono } from '../../shared/icono';

@Component({
  selector: 'cv-tab-muro',
  imports: [Icono, DatePipe, ReactiveFormsModule, RouterLink, BotonDescarga, Paginador],
  templateUrl: './tab-muro.html',
  styleUrl: './tab-muro.css',
})
export class TabMuro implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly catalogo = inject(CatalogoApi);
  protected readonly sesion = inject(SesionService);

  readonly idComunidad = input.required<number>();
  readonly moderada = input(false);
  readonly revision = input(false);

  protected readonly iniciales = iniciales;
  protected readonly publicaciones = signal<VistaPublicacion[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly adjuntos = signal<Archivo[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly publicando = signal(false);
  protected readonly subiendo = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', Validators.maxLength(200)],
    contenido: ['', Validators.maxLength(20000)],
  });

  ngOnInit(): void {
    this.cargar(0);
  }

  protected cargar(p: number): void {
    const pedido = this.revision() ? this.api.pendientes(this.idComunidad()) : this.api.muro(this.idComunidad(), p);
    pedido.subscribe({
      next: (r) => {
        this.publicaciones.set(r.content);
        this.pagina.set(r.page.number);
        this.totalPaginas.set(r.page.totalPages);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected adjuntar(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    for (const f of archivos) {
      if (this.adjuntos().length >= 10) return this.error.set('Máximo 10 archivos por publicación.');
      if (f.size > LIMITE_ARCHIVO) return this.error.set(`"${f.name}" supera los 50 MB.`);
      this.subiendo.set(true);
      this.catalogo.subirArchivo(f).subscribe({
        next: (a) => {
          this.subiendo.set(false);
          this.adjuntos.update((l) => [...l, a]);
        },
        error: (e) => {
          this.subiendo.set(false);
          this.error.set(textoError(e));
        },
      });
    }
  }

  protected quitar(a: Archivo): void {
    this.adjuntos.update((l) => l.filter((x) => x.idArchivo !== a.idArchivo));
  }

  protected publicar(): void {
    this.error.set(null);
    this.exito.set(null);
    const v = this.form.getRawValue();
    if (!v.titulo.trim() && !v.contenido.trim() && !this.adjuntos().length) {
      this.error.set('Escribe algo o adjunta un archivo.');
      return;
    }
    this.publicando.set(true);
    this.api
      .publicar(this.idComunidad(), {
        titulo: v.titulo.trim() || null,
        contenido: v.contenido.trim() || null,
        archivos: this.adjuntos().map((a) => a.idArchivo),
      })
      .subscribe({
        next: (p) => {
          this.publicando.set(false);
          this.form.reset();
          this.adjuntos.set([]);
          this.exito.set(p.estado === 'PENDIENTE' ? 'Tu publicación quedó en revisión. Aparecerá cuando un moderador la apruebe.' : '¡Publicado!');
          this.cargar(0);
        },
        error: (e) => {
          this.publicando.set(false);
          this.error.set(textoError(e));
        },
      });
  }

  protected moderar(v: VistaPublicacion, estado: 'APROBADA' | 'RECHAZADA'): void {
    this.api.moderar(v.publicacion.idPublicacion, estado).subscribe({
      next: () => {
        this.exito.set(estado === 'APROBADA' ? 'Publicación aprobada.' : 'Publicación rechazada.');
        this.cargar(0);
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected eliminar(v: VistaPublicacion): void {
    if (!confirm('¿Eliminar esta publicación?')) return;
    this.api.eliminarPublicacion(v.publicacion.idPublicacion).subscribe({
      next: () => this.cargar(this.pagina()),
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected esMia(v: VistaPublicacion): boolean {
    return v.autor.id === this.sesion.sesion()?.idUsuario;
  }
}
