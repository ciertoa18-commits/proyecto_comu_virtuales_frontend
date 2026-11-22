import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AjustesService } from './core/ajustes/ajustes.service';
import { Dialogo } from './shared/dialogo';

@Component({ selector: 'cv-root', imports: [RouterOutlet, Dialogo], template: '<router-outlet /><cv-dialogo />' })
export class App {
  /** Aplica el tema y demás ajustes en todas las pantallas, también en el login. */
  protected readonly ajustes = inject(AjustesService);
}
