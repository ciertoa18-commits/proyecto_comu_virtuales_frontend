import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { DatosComunidad, Pueblo, Visibilidad } from '../../core/modelos';
import { errorCampo, erroresPorCampo, textoError } from '../../core/util/errores';
import { LIMITE_FOTO } from '../../core/util/texto';
import { Icono } from '../../shared/icono';
import { ImagenArchivo } from '../../shared/imagen-archivo';

export const OTRA_CATEGORIA = -1;

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

@Component({
  selector: 'cv-formulario-comunidad',
  imports: [ReactiveFormsModule, RouterLink, Icono, ImagenArchivo],
  templateUrl: './formulario.html',
  styleUrl: './formulario.css',
})
export class FormularioComunidad implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly catalogo = inject(CatalogoApi);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly otraCategoria = OTRA_CATEGORIA;
  protected readonly categorias = toSignal(this.catalogo.categorias$, { initialValue: [] });
  protected readonly idiomas = toSignal(this.catalogo.idiomas$, { initialValue: [] });
  protected readonly pueblos = toSignal(this.catalogo.pueblos$, { initialValue: [] });
  protected readonly error = signal<string | null>(null);
  protected readonly delServidor = signal<Record<string, string>>({});
  protected readonly guardando = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly segundas = signal(new Set<number>());
  protected readonly textoPueblo = signal('');
  protected readonly listaPueblos = signal(false);

  protected readonly form = inject(FormBuilder).group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', Validators.maxLength(1000)],
    idCategoria: [null as number | null, Validators.required],
    nuevaCategoria: ['', Validators.maxLength(100)],
    descripcionCategoria: ['', Validators.maxLength(500)],
    idIdioma: [null as number | null],
    idPueblo: [null as number | null],
    visibilidad: ['PUBLICA' as Visibilidad],
    moderacionPrevia: [false],
    idImagen: [null as number | null],
  });

  private readonly idCategoria = toSignal(this.form.controls.idCategoria.valueChanges, { initialValue: null });
  private readonly idIdioma = toSignal(this.form.controls.idIdioma.valueChanges, { initialValue: null });
  protected readonly esOtra = computed(() => this.idCategoria() === OTRA_CATEGORIA);
  protected readonly lenguasDisponibles = computed(() => this.idiomas().filter((i) => i.idIdioma !== this.idIdioma()));
  protected readonly pueblosFiltrados = computed(() => {
    const q = sinTildes(this.textoPueblo().trim());
    const lista = this.pueblos();
    return (q ? lista.filter((p) => sinTildes(p.nombre).includes(q) || sinTildes(p.familiaLinguistica ?? '').includes(q)) : lista).slice(0, 60);
  });

  constructor() {
    this.form.controls.idCategoria.valueChanges.subscribe((v) => {
      const c = this.form.controls.nuevaCategoria;
      c.setValidators(v === OTRA_CATEGORIA ? [Validators.required, Validators.maxLength(100)] : Validators.maxLength(100));
      c.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.api.obtener(+id).subscribe({
        next: (c) => {
          this.form.patchValue(c);
          const p = this.pueblos().find((x) => x.idPueblo === c.idPueblo);
          if (p) this.textoPueblo.set(p.nombre);
          else if (c.idPueblo) this.catalogo.pueblos$.subscribe((l) => this.textoPueblo.set(l.find((x) => x.idPueblo === c.idPueblo)?.nombre ?? ''));
        },
        error: (e) => this.error.set(textoError(e)),
      });
      this.api.segundasLenguas(+id).subscribe({ next: (l) => this.segundas.set(new Set(l)), error: () => undefined });
    }
  }

  protected err(c: keyof typeof this.form.controls): string | null {
    return this.delServidor()[c] ?? errorCampo(this.form.controls[c]);
  }

  protected escribirPueblo(texto: string): void {
    this.textoPueblo.set(texto);
    this.listaPueblos.set(true);
    if (!texto.trim()) this.form.controls.idPueblo.setValue(null);
  }

  protected elegirPueblo(p: Pueblo | null): void {
    this.form.controls.idPueblo.setValue(p?.idPueblo ?? null);
    this.textoPueblo.set(p?.nombre ?? '');
    this.listaPueblos.set(false);
  }

  protected cerrarPueblos(): void {
    setTimeout(() => {
      this.listaPueblos.set(false);
      const elegido = this.pueblos().find((x) => x.idPueblo === this.form.controls.idPueblo.value);
      this.textoPueblo.set(elegido?.nombre ?? '');
    }, 150);
  }

  protected alternarLengua(id: number): void {
    this.segundas.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
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
    const categoria$: Observable<number> =
      v.idCategoria === OTRA_CATEGORIA
        ? this.catalogo
            .crearCategoria({ nombre: v.nuevaCategoria!.trim(), descripcion: v.descripcionCategoria?.trim() || null })
            .pipe(switchMap((c) => of(c.idCategoria)))
        : of(v.idCategoria!);
    const id = this.id();
    this.guardando.set(true);
    categoria$
      .pipe(
        switchMap((idCategoria) => {
          if (v.idCategoria === OTRA_CATEGORIA) this.form.controls.idCategoria.setValue(idCategoria);
          const datos: DatosComunidad = {
            nombre: v.nombre!.trim(),
            descripcion: v.descripcion?.trim() || null,
            idCategoria,
            idIdioma: v.idIdioma,
            idPueblo: v.idPueblo,
            visibilidad: v.visibilidad!,
            moderacionPrevia: !!v.moderacionPrevia,
            idImagen: v.idImagen,
            segundasLenguas: [...this.segundas()].filter((x) => x !== v.idIdioma),
          };
          return id ? this.api.editar(+id, datos) : this.api.crear(datos);
        }),
      )
      .subscribe({
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
