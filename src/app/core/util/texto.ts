export function iniciales(nombre: string | null | undefined): string {
  const p = (nombre ?? '').split(/[\s@.]+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function aFechaJava(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return valor.length === 16 ? `${valor}:00` : valor;
}

export function aInputFecha(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 16) : '';
}

export function portada(id: number): string {
  return `img/com${(id % 8) + 1}.jpg`;
}

export function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const LIMITE_ARCHIVO = 50 * 1024 * 1024;
export const LIMITE_FOTO = 2 * 1024 * 1024;
