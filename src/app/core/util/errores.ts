import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';
import { ErrorApi } from '../modelos';

export function textoError(e: unknown): string {
  if (!(e instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado.';
  if (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504) return 'No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.';
  const cuerpo = e.error as ErrorApi | null;
  if (cuerpo?.mensaje) return cuerpo.mensaje;
  if (e.status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
  if (e.status === 403) return 'No tienes permiso para hacer esto.';
  if (e.status === 404) return 'No se encontró lo que buscas.';
  if (e.status === 413) return 'El archivo es demasiado grande.';
  if (e.status >= 500) return 'Ocurrió un problema en el servidor. Intenta de nuevo.';
  return 'No se pudo completar la acción.';
}

export function erroresPorCampo(e: unknown): Record<string, string> {
  const cuerpo = e instanceof HttpErrorResponse ? (e.error as ErrorApi | null) : null;
  const r: Record<string, string> = {};
  if (cuerpo?.codigo !== 'VALIDACION') return r;
  for (const parte of cuerpo.mensaje.split(';')) {
    const i = parte.indexOf(':');
    if (i > 0) r[parte.slice(0, i).trim()] = parte.slice(i + 1).trim();
  }
  return r;
}

export function errorCampo(c: AbstractControl, formato = 'Formato no válido.'): string | null {
  if (!c.touched || !c.errors) return null;
  const e = c.errors;
  if (e['required']) return 'Este campo es obligatorio.';
  if (e['email']) return 'Escribe un correo válido.';
  if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres.`;
  if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres.`;
  if (e['claveDebil']) return `Contraseña poco segura: le falta ${(e['claveDebil'] as string[]).join(', ')}.`;
  if (e['min']) return `Debe ser al menos ${e['min'].min}.`;
  if (e['max']) return `Debe ser como máximo ${e['max'].max}.`;
  if (e['pattern']) return formato;
  return null;
}
