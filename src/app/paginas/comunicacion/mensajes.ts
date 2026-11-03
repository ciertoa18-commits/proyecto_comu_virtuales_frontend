import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ComunicacionApi } from '../../core/api/comunicacion.api';
import { Mensaje, NOMBRE_ROL, Persona, Rol } from '../../core/modelos';
import { SesionService } from '../../core/sesion/sesion.service';
import { PersonasService } from '../../core/util/personas.service';
import { textoError } from '../../core/util/errores';
import { iniciales } from '../../core/util/texto';

interface Conversacion { con: number; ultimo: Mensaje; sinLeer: number; }

/** Mensajes privados entre usuarios (bandeja + chat). */
@Component({
  selector: 'cv-mensajes',
  imports: [DatePipe],
  templateUrl: './mensajes.html',
  styleUrl: './mensajes.css',
})
export class Mensajes implements OnInit {
  private readonly api = inject(ComunicacionApi);
  protected readonly sesion = inject(SesionService);
  protected readonly personas = inject(PersonasService);
  protected readonly iniciales = iniciales;
  private readonly fin = viewChild<ElementRef<HTMLElement>>('fin');

  protected readonly todos = signal<Mensaje[]>([]);
  protected readonly con = signal<number | null>(null);
  protected readonly chat = signal<Mensaje[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly contactos = signal<Persona[]>([]);
  protected readonly filtro = signal('');
  protected readonly mostrarContactos = signal(false);
  protected readonly resultados = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    return this.contactos()
      .filter((p) => !q || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q))
      .slice(0, 30);
  });
  private readonly yo = this.sesion.sesion()?.idUsuario ?? 0;

  /** Agrupa los mensajes por la otra persona, el más reciente primero. */
  protected readonly conversaciones = computed<Conversacion[]>(() => {
    const mapa = new Map<number, Conversacion>();
    for (const m of this.todos()) {
      const otro = m.idEmisor === this.yo ? m.idReceptor : m.idEmisor;
      const c = mapa.get(otro) ?? { con: otro, ultimo: m, sinLeer: 0 };
      if (m.fechaEnvio > c.ultimo.fechaEnvio) c.ultimo = m;
      if (!m.leido && m.idReceptor === this.yo) c.sinLeer++;
      mapa.set(otro, c);
    }
    return [...mapa.values()].sort((a, b) => b.ultimo.fechaEnvio.localeCompare(a.ultimo.fechaEnvio));
  });

  ngOnInit(): void {
    this.cargarBandeja();
    this.api.contactos().subscribe({
      next: (l) => {
        this.contactos.set(l);
        l.forEach((p) => this.personas.recordar(p));
      },
      error: () => undefined,
    });
  }

  private cargarBandeja(): void {
    this.api.mensajes().subscribe({ next: (p) => this.todos.set(p.content), error: (e) => this.error.set(textoError(e)) });
  }

  protected abrir(con: number): void {
    this.con.set(con);
    this.mostrarContactos.set(false);
    this.api.mensajes(con).subscribe({
      next: (p) => {
        this.chat.set([...p.content].sort((a, b) => a.fechaEnvio.localeCompare(b.fechaEnvio)));
        setTimeout(() => this.fin()?.nativeElement.scrollIntoView({ block: 'end' }));
        // Marca como leídos los que me llegaron.
        for (const m of p.content) if (!m.leido && m.idReceptor === this.yo) this.api.marcarMensajeLeido(m.idMensaje).subscribe({ error: () => undefined });
        this.todos.update((l) => l.map((m) => (m.idEmisor === con && m.idReceptor === this.yo ? { ...m, leido: true } : m)));
      },
      error: (e) => this.error.set(textoError(e)),
    });
  }

  protected nueva(p: Persona, caja: HTMLInputElement): void {
    caja.value = '';
    this.filtro.set('');
    this.abrir(p.idUsuario);
  }

  protected rolDe(r: Rol | ''): string {
    return r ? NOMBRE_ROL[r] : '';
  }

  protected enviar(caja: HTMLTextAreaElement): void {
    const texto = caja.value.trim();
    const con = this.con();
    if (!texto || !con) return;
    this.enviando.set(true);
    this.api.enviarMensaje(con, texto).subscribe({
      next: (m) => {
        this.enviando.set(false);
        caja.value = '';
        this.chat.update((l) => [...l, m]);
        this.todos.update((l) => [m, ...l]);
        setTimeout(() => this.fin()?.nativeElement.scrollIntoView({ block: 'end' }));
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(textoError(e));
      },
    });
  }
}
