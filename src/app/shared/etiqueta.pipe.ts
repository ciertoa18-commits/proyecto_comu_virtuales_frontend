import { Pipe, PipeTransform } from '@angular/core';

/** Textos con tilde o distintos al valor guardado en la base de datos. */
const ESPECIALES: Record<string, string> = {
  ADMIN: 'Administrador',
  EN_CURSO: 'En curso',
  PRACTICA: 'Práctica',
  PARTICIPACION: 'Participación',
  TARDIA: 'Tardía',
  PUBLICA: 'Pública',
  BORRADOR: 'Borrador',
  EXAMEN: 'Examen',
  JUSTIFICADA: 'Justificada',
  DOCUMENTO: 'Documento',
  ENLACE: 'Enlace',
  VIDEO: 'Video',
};

/**
 * Convierte los valores internos (EN_CURSO, DESAPROBADO, PRACTICA...) en texto legible
 * ("En curso", "Desaprobado", "Práctica"). Uso: {{ s.estado | etiqueta }}
 */
@Pipe({ name: 'etiqueta' })
export class EtiquetaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) return '';
    if (ESPECIALES[valor]) return ESPECIALES[valor];
    if (!/^[A-Z0-9_]+$/.test(valor)) return valor;
    const t = valor.replace(/_/g, ' ').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
}
