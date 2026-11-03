/** "Rosa Quispe" → "RQ". */
export function iniciales(nombre: string | null | undefined): string {
  const p = (nombre ?? '').split(/[\s@.]+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Valor de un <input type="datetime-local"> → "2026-11-02T10:30:00" (LocalDateTime de Java). */
export function aFechaJava(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return valor.length === 16 ? `${valor}:00` : valor;
}

/** "2026-11-02T10:30:00" → "2026-11-02T10:30" para rellenar un datetime-local. */
export function aInputFecha(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 16) : '';
}

/** Imagen de portada por defecto (img/com1..8.jpg) según el id. */
export function portada(id: number): string {
  return `img/com${(id % 8) + 1}.jpg`;
}

/** Tamaño legible: 2048 → "2 KB". */
export function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const LIMITE_ARCHIVO = 50 * 1024 * 1024;
export const LIMITE_FOTO = 2 * 1024 * 1024;
