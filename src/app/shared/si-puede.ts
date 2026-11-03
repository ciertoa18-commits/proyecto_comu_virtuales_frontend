import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Accion } from '../core/sesion/permisos';
import { SesionService } from '../core/sesion/sesion.service';

/** Muestra el bloque solo si el rol puede: <button *siPuede="'CURSO_GESTIONAR'">. */
@Directive({ selector: '[siPuede]' })
export class SiPuede {
  readonly siPuede = input.required<Accion>();
  private readonly sesion = inject(SesionService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private visible = false;

  constructor() {
    effect(() => {
      const puede = this.sesion.puede(this.siPuede());
      if (puede && !this.visible) this.vcr.createEmbeddedView(this.tpl);
      if (!puede && this.visible) this.vcr.clear();
      this.visible = puede;
    });
  }
}
