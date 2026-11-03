import { AsyncPipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { DatosComunidad, Visibilidad } from '../../core/modelos';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { LIMITE_FOTO } from '../../core/util/texto';
import { ImagenArchivo } from '../../shared/imagen-archivo';

/** CU05 · Crear o editar una comunidad (solo administrador). */
@Component({
  selector: 'cv-formulario-comunidad',
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe, ImagenArchivo],
  templateUrl: './formulario.html',
  styleUrl: './formulario.css',
})
export class FormularioComunidad implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly catalogo = inject(CatalogoApi);
  private readonly router = inject(Router);

  /** Viene de la ruta /comunidades/:id/editar (vacío al crear). */
  readonly id = input<string>();

  protected readonly categorias$ = this.catalogo.categorias$;
  protected readonly idiomas$ = this.catalogo.idiomas$;
  protected readonly pueblos$ = this.catalogo.pueblos$;
  protected readonly error = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly guardando = signal(false);
  protected readonly subiendo = signal(false);

  protected readonly form = inject(FormBuilder).group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', Validators.maxLength(1000)],
    idCategoria: [null as number | null, Validators.required],
    idIdioma: [null as number | null],
    idPueblo: [null as number | null],
    visibilidad: ['PUBLICA' as Visibilidad],
    moderacionPrevia: [false],
    idImagen: [null as number | null],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.obtener(+id).subscribe({
        next: (c) => this.form.patchValue(c),
        error: (e) => this.error.set(textoError(e)),
      });
    }
  }

  protected err(c: keyof typeof this.form.controls): string | null {
    return this.delServidor()[c] ?? errorCampo(this.form.controls[c]);
  }

  protected subirImagen(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    if (!/\.(jpe?g|png)$/i.test(f.name) || f.size > LIMITE_FOTO) {
      this.error.set('La imagen debe ser JPG o PNG de máximo 2 MB.');
      input.value = '';
      return;
    }
    this.subiendo.set(true);
    this.catalogo.subirArchivo(f).subscribe({
      next: (a) => {
        this.subiendo.set(false);
        this.form.controls.idImagen.setValue(a.idArchivo);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected guardar(): void {
    this.error.set(null);
    this.delServidor.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos: DatosComunidad = {
      nombre: v.nombre!.trim(),
      descripcion: v.descripcion?.trim() || null,
      idCategoria: v.idCategoria!,
      idIdioma: v.idIdioma,
      idPueblo: v.idPueblo,
      visibilidad: v.visibilidad!,
      moderacionPrevia: !!v.moderacionPrevia,
      idImagen: v.idImagen,
    };
    const id = this.id();
    this.guardando.set(true);
    (id ? this.api.editar(+id, datos) : this.api.crear(datos)).subscribe({
      next: (c) => void this.router.navigate(['/comunidades', c.idComunidad]),
      error: (e) => {
        this.guardando.set(false);
        this.delServidor.set(erroresPorCampo(e));
        this.error.set(textoError(e));
      },
    });
  }

  protected eliminar(): void {
    const id = this.id();
    if (!id || !confirm('¿Eliminar esta comunidad? Sus miembros ya no podrán verla.')) return;
    this.api.eliminar(+id).subscribe({
      next: () => void this.router.navigate(['/comunidades']),
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
