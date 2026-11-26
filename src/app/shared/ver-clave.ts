import { Directive, ElementRef, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';

/**
 * Agrega un "ojito" a todos los campos de contraseña para mostrar u ocultar lo que se escribe.
 * Se aplica solo a cualquier <input type="password"> del componente que la importe.
 */
@Directive({ selector: 'input[type=password]' })
export class VerClave implements OnInit, OnDestroy {
  private readonly campo = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly r = inject(Renderer2);
  private boton?: HTMLButtonElement;
  private quitarClick?: () => void;

  ngOnInit(): void {
    const padre = this.campo.parentNode;
    if (!padre) return;
    const envoltura = this.r.createElement('span') as HTMLSpanElement;
    this.r.addClass(envoltura, 'clave-con-ojo');
    this.r.insertBefore(padre, envoltura, this.campo);
    this.r.appendChild(envoltura, this.campo);

    const boton = this.r.createElement('button') as HTMLButtonElement;
    this.r.setAttribute(boton, 'type', 'button');
    this.r.addClass(boton, 'clave-ojo');
    const icono = this.r.createElement('span') as HTMLSpanElement;
    this.r.addClass(icono, 'material-symbols-outlined');
    this.r.setAttribute(icono, 'aria-hidden', 'true');
    this.r.appendChild(boton, icono);
    this.r.appendChild(envoltura, boton);
    this.boton = boton;
    this.pintar(false);
    this.quitarClick = this.r.listen(boton, 'click', (e: Event) => {
      e.preventDefault();
      this.pintar(this.campo.type === 'password');
      this.campo.focus();
    });
  }

  private pintar(visible: boolean): void {
    if (!this.boton) return;
    this.campo.type = visible ? 'text' : 'password';
    this.boton.querySelector('span')!.textContent = visible ? 'visibility_off' : 'visibility';
    const texto = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    this.r.setAttribute(this.boton, 'aria-label', texto);
    this.r.setAttribute(this.boton, 'title', texto);
    this.r.setAttribute(this.boton, 'aria-pressed', String(visible));
  }

  ngOnDestroy(): void {
    this.quitarClick?.();
  }
}
