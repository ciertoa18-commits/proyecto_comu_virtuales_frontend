import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Texto de ayuda que se muestra debajo de cada campo de contraseña nueva. */
export const AYUDA_CLAVE = 'Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo (ej. ! @ # $ %).';

const REGLAS: [RegExp, string][] = [
  [/[A-Z]/, 'una mayúscula'],
  [/[a-z]/, 'una minúscula'],
  [/[0-9]/, 'un número'],
  [/[^A-Za-z0-9]/, 'un símbolo'],
];

/** Contraseña segura: debe tener mayúscula, minúscula, número y símbolo (el largo lo controla minLength). */
export function claveSegura(c: AbstractControl): ValidationErrors | null {
  const v = (c.value as string | null) ?? '';
  if (!v) return null;
  const faltan = REGLAS.filter(([r]) => !r.test(v)).map(([, texto]) => texto);
  return faltan.length ? { claveDebil: faltan } : null;
}
