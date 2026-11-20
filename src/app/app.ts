import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Dialogo } from './shared/dialogo';

@Component({ selector: 'cv-root', imports: [RouterOutlet, Dialogo], template: '<router-outlet /><cv-dialogo />' })
export class App {}
