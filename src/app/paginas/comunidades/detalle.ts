import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ComunidadApi } from '../../core/api/comunidad.api';
import { Comunidad, MiComunidad } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { textoError } from '../../core/util/errores';
import { portada } from '../../core/util/texto';
import { ImagenArchivo } from '../../shared/imagen-archivo';
import { Modal } from '../../shared/modal';
import { SiPuede } from '../../shared/si-puede';
import { TabCursos } from './tab-cursos';
import { TabEventos } from './tab-eventos';
import { TabMiembros } from './tab-miembros';
import { TabMuro } from './tab-muro';

type Pestana = 'muro' | 'cursos' | 'eventos' | 'miembros' | 'revisar';

@Component({
  selector: 'cv-detalle-comunidad',
  imports: [RouterLink, ImagenArchivo, Modal, SiPuede, TabMuro, TabCursos, TabEventos, TabMiembros],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class DetalleComunidad implements OnInit {
  private readonly api = inject(ComunidadApi);
  private readonly router = inject(Router);
  protected readonly sesion = inject(SesionService);

  readonly id = input.required<string>();
  protected readonly portada = portada;

  protected readonly comunidad = signal<Comunidad | null>(null);
  protected readonly mia = signal<MiComunidad | null>(null);
  protected readonly pestana = signal<Pestana>('muro');
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly pidiendo = signal(false);
  protected readonly modalSolicitud = signal(false);

  protected readonly esAdmin = computed(() => this.sesion.rol() === 'ADMIN');
  protected readonly puedeVer = computed(() => this.esAdmin() || this.mia()?.estado === 'MIEMBRO');
  protected readonly esModerador = computed(
    () => this.esAdmin() || (this.mia()?.estado === 'MIEMBRO' && this.mia()?.rolComunidad !== 'MIEMBRO'),
  );

  ngOnInit(): void {
    this.api.obtener(+this.id()).subscribe({
      next: (c) => this.comunidad.set(c),
      error: (e) => this.error.set(textoError(e)),
    });
    this.refrescarMembresia();
  }

  private refrescarMembresia(): void {
    this.api.mias().subscribe({
      next: (l) => this.mia.set(l.find((m) => m.idComunidad === +this.id()) ?? null),
      error: () => undefined,
    });
  }

  protected unirse(): void {
    this.error.set(null);
    this.pidiendo.set(true);
    this.api.unirse(+this.id()).subscribe({
      next: () => {
        this.pidiendo.set(false);
        this.exito.set('¡Bienvenido a la comunidad! 🎉');
        this.refrescarMembresia();
      },
      error: (e) => {
        this.pidiendo.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected solicitar(mensaje: string): void {
    this.pidiendo.set(true);
    this.api.solicitarIngreso(+this.id(), mensaje.trim() || null).subscribe({
      next: () => {
        this.pidiendo.set(false);
        this.modalSolicitud.set(false);
        this.exito.set('Solicitud enviada. Te avisaremos cuando el administrador responda.');
        this.refrescarMembresia();
      },
      error: (e) => {
        this.pidiendo.set(false);
        this.modalSolicitud.set(false);
        this.error.set(textoError(e));
      },
    });
  }

  protected salir(): void {
    if (!confirm('¿Seguro que quieres salir de esta comunidad?')) return;
    this.api.salir(+this.id()).subscribe({
      next: () => void this.router.navigate(['/comunidades']),
      error: (e) => this.error.set(textoError(e)),
    });
  }
}
