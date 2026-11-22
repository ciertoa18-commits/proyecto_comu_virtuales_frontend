import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Acento, AjustesService, Letra, Tema } from '../../core/ajustes/ajustes.service';
import { Icono, NombreIcono } from '../../shared/icono';

@Component({
  selector: 'cv-ajustes',
  imports: [RouterLink, Icono],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes {
  protected readonly ajustes = inject(AjustesService);
  protected readonly p = computed(() => this.ajustes.preferencias());

  protected readonly temas: { valor: Tema; texto: string; icono: NombreIcono; ayuda: string }[] = [
    { valor: 'claro', texto: 'Claro', icono: 'brillo', ayuda: 'Fondo blanco' },
    { valor: 'oscuro', texto: 'Oscuro', icono: 'luna', ayuda: 'Descansa la vista de noche' },
    { valor: 'sistema', texto: 'Automático', icono: 'computadora', ayuda: 'Igual que tu computadora' },
  ];
  protected readonly acentos: { valor: Acento; texto: string; color: string }[] = [
    { valor: 'gris', texto: 'Gris', color: '#4b5563' },
    { valor: 'azul', texto: 'Azul', color: '#1b4f9c' },
    { valor: 'verde', texto: 'Verde', color: '#1f6b45' },
    { valor: 'morado', texto: 'Morado', color: '#5b3f8c' },
  ];
  protected readonly letras: { valor: Letra; texto: string; muestra: string }[] = [
    { valor: 'normal', texto: 'Normal', muestra: '1rem' },
    { valor: 'grande', texto: 'Grande', muestra: '1.15rem' },
    { valor: 'muy-grande', texto: 'Muy grande', muestra: '1.3rem' },
  ];

  protected interruptor(clave: 'reducirAnimaciones' | 'altoContraste' | 'menuAbiertoAlEntrar', ev: Event): void {
    this.ajustes.cambiar(clave, (ev.target as HTMLInputElement).checked);
  }
}
