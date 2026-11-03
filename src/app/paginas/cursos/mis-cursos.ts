import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademicoApi } from '../../core/api/academico.api';
import { SeccionResumen } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { portada } from '../../core/util/texto';

/** Cursos en los que estoy (estudiante), que dicto (docente) o todas las secciones (admin). */
@Component({
  selector: 'cv-mis-cursos',
  imports: [RouterLink],
  template: `
    <h1>{{ titulo }}</h1>
    <p class="subtitulo-pagina">{{ subtitulo }}</p>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <div class="rejilla">
      @for (s of secciones(); track s.idSeccion) {
        <a class="com-card" [routerLink]="['/secciones', s.idSeccion]">
          <div class="com-banner" [style.background-image]="'url(' + portada(s.idCurso) + ')'"></div>
          <div class="com-body">
            <div class="com-titulo"><strong>{{ s.curso }}</strong><span class="badge-tipo" [class.priv]="s.estado === 'CERRADA'">{{ s.estado }}</span></div>
            <p class="com-desc">Grupo {{ s.grupo }}</p>
          </div>
        </a>
      } @empty {
        <div class="bloque vacio">
          <p>{{ cargando() ? 'Cargando...' : 'Todavía no tienes cursos.' }}</p>
          @if (!cargando()) { <a class="btn btn-primario" routerLink="/comunidades">Explorar comunidades</a> }
        </div>
      }
    </div>
  `,
})
export class MisCursos implements OnInit {
  private readonly api = inject(AcademicoApi);
  private readonly rol = inject(SesionService).rol();
  protected readonly portada = portada;
  protected readonly secciones = signal<SeccionResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly titulo = this.rol === 'DOCENTE' ? 'Mis clases' : 'Mis cursos';
  protected readonly subtitulo =
    this.rol === 'DOCENTE'
      ? 'Las secciones que dictas: contenido, evaluaciones, notas y asistencia.'
      : 'Los cursos en los que estás matriculado. Para matricularte en otro, entra a una comunidad → Cursos.';

  ngOnInit(): void {
    this.api.misSecciones().subscribe({
      next: (s) => {
        this.secciones.set(s);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
