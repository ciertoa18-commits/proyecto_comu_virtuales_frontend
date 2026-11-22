import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { VistaComentario, VistaPublicacion } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { iniciales } from '../../core/util/texto';
import { BotonDescarga } from '../../shared/boton-descarga';
import { Icono } from '../../shared/icono';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { DialogoService } from '../../shared/dialogo';

@Component({
  selector: 'cv-publicacion',
  imports: [EtiquetaPipe, Icono, DatePipe, NgTemplateOutlet, RouterLink, BotonDescarga],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class PaginaPublicacion implements OnInit {
  private readonly dialogo = inject(DialogoService);
  private readonly api = inject(ComunidadApi);
  protected readonly sesion = inject(SesionService);
  readonly id = input.required<string>();

  protected readonly iniciales = iniciales;
  protected readonly vista = signal<VistaPublicacion | null>(null);
  protected readonly comentarios = signal<VistaComentario[]>([]);
  protected readonly respondiendo = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly hilos = computed(() => {
    const todos = this.comentarios().filter((c) => !c.comentario.eliminado);
    return todos
      .filter((c) => !c.comentario.idComentarioPadre)
      .map((c) => ({ c, respuestas: todos.filter((r) => r.comentario.idComentarioPadre === c.comentario.idComentario) }));
  });

  ngOnInit(): void {
    this.api.publicacion(+this.id()).subscribe({ next: (v) => this.vista.set(v), error: (e) => this.error.set(textoError(e)) });
    this.cargar();
  }

  private cargar(): void {
    this.api.comentarios(+this.id()).subscribe({ next: (p) => this.comentarios.set(p.content), error: () => undefined });
  }

  protected comentar(caja: HTMLTextAreaElement, padre: number | null): void {
    const texto = caja.value.trim();
    if (!texto) return;
    this.enviando.set(true);
    this.api.comentar(+this.id(), texto, padre).subscribe({
      next: () => {
        this.enviando.set(false);
        caja.value = '';
        this.respondiendo.set(null);
        this.cargar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected async eliminar(c: VistaComentario): Promise<void> {
    if (!(await this.dialogo.confirmar('¿Eliminar este comentario?', { titulo: 'Eliminar comentario', aceptar: 'Eliminar', peligro: true }))) return;
    this.api.eliminarComentario(c.comentario.idComentario).subscribe({ next: () => this.cargar(), error: (e) => this.error.set(textoError(e)) });
  }

  protected puedeBorrar(c: VistaComentario): boolean {
    return c.autor.id === this.sesion.sesion()?.idUsuario || this.sesion.rol() === 'ADMIN';
  }
}
