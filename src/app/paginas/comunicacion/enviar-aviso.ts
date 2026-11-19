import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { AcademicoApi } from '../../core/api/academico.api';
import { ComunicacionApi } from '../../core/api/comunicacion.api';
import { DestinoAviso, NOMBRE_ROL, SeccionResumen, UsuarioResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { errorCampo, textoError } from '../../core/util/errores';

interface Opcion { valor: DestinoAviso; icono: string; titulo: string; detalle: string; soloAdmin: boolean; }

@Component({
  selector: 'cv-enviar-aviso',
  imports: [ReactiveFormsModule],
  templateUrl: './enviar-aviso.html',
  styleUrl: './enviar-aviso.css',
})
export class EnviarAviso implements OnInit {
  private readonly api = inject(ComunicacionApi);
  private readonly academico = inject(AcademicoApi);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nombreRol = NOMBRE_ROL;
  protected readonly errorCampo = errorCampo;
  private readonly todas: Opcion[] = [
    { valor: 'TODOS', icono: '🌎', titulo: 'Todos', detalle: 'Docentes, estudiantes y administradores', soloAdmin: true },
    { valor: 'DOCENTES', icono: '🧑‍🏫', titulo: 'Todos los docentes', detalle: 'Cuentas de docente activas', soloAdmin: true },
    { valor: 'ESTUDIANTES', icono: '🎒', titulo: 'Todos los alumnos', detalle: 'Cuentas de estudiante activas', soloAdmin: true },
    { valor: 'SECCION', icono: '🏫', titulo: 'Alumnos de una sección', detalle: 'Los matriculados en un curso', soloAdmin: false },
    { valor: 'USUARIO', icono: '👤', titulo: 'Una persona', detalle: 'Búscala por nombre o correo', soloAdmin: false },
  ];
  protected readonly opciones = computed(() => this.todas.filter((o) => !o.soloAdmin || this.sesion.rol() === 'ADMIN'));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    destino: ['' as DestinoAviso | '', Validators.required],
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    contenido: ['', Validators.maxLength(500)],
  });

  protected readonly secciones = signal<SeccionResumen[]>([]);
  protected readonly idSeccion = signal<number | null>(null);
  protected readonly resultados = signal<UsuarioResumen[]>([]);
  protected readonly persona = signal<UsuarioResumen | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly enviando = signal(false);
  private readonly busqueda = new Subject<string>();

  ngOnInit(): void {
    this.academico.misSecciones().subscribe({ next: (s) => this.secciones.set(s), error: () => undefined });
    this.busqueda
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length < 2 ? of([]) : this.api.buscarPersonas(q.trim()).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => this.resultados.set(r));
  }

  protected get destino(): DestinoAviso | '' {
    return this.form.controls.destino.value;
  }

  protected elegir(d: DestinoAviso): void {
    this.form.controls.destino.setValue(d);
    this.error.set(null);
  }

  protected buscar(q: string): void {
    this.busqueda.next(q);
  }

  protected elegirPersona(u: UsuarioResumen): void {
    this.persona.set(u);
    this.resultados.set([]);
  }

  protected resumen(): string {
    switch (this.destino) {
      case 'TODOS': return 'todos los usuarios activos';
      case 'DOCENTES': return 'todos los docentes';
      case 'ESTUDIANTES': return 'todos los alumnos';
      case 'SECCION': {
        const s = this.secciones().find((x) => x.idSeccion === this.idSeccion());
        return s ? `los alumnos de ${s.curso} (grupo ${s.grupo})` : 'una sección';
      }
      case 'USUARIO': {
        const p = this.persona();
        return p ? `${p.nombres} ${p.apellidos}` : 'una persona';
      }
      default: return '';
    }
  }

  protected enviar(): void {
    this.error.set(null);
    this.exito.set(null);
    if (!this.destino) return this.error.set('Elige a quién enviar el aviso.');
    if (this.form.invalid) return this.form.markAllAsTouched();
    if (this.destino === 'SECCION' && !this.idSeccion()) return this.error.set('Elige la sección.');
    if (this.destino === 'USUARIO' && !this.persona()) return this.error.set('Busca y elige a la persona.');
    if (['TODOS', 'DOCENTES', 'ESTUDIANTES'].includes(this.destino) && !confirm(`Se enviará a ${this.resumen()}. ¿Continuar?`)) return;

    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.api
      .enviarAviso({
        destino: v.destino as DestinoAviso,
        idSeccion: v.destino === 'SECCION' ? this.idSeccion() : null,
        idUsuario: v.destino === 'USUARIO' ? (this.persona()?.idUsuario ?? null) : null,
        titulo: v.titulo.trim(),
        contenido: v.contenido.trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.enviando.set(false);
          this.exito.set(r.mensaje);
          this.form.reset();
          this.persona.set(null);
          this.idSeccion.set(null);
        },
        error: (e) => {
          this.enviando.set(false);
          this.error.set(textoError(e));
        },
      });
  }

  protected numero(v: string): number | null {
    return v ? +v : null;
  }
}
