export function params(valores: Record<string, string | number | boolean | null | undefined>): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(valores)) if (v !== null && v !== undefined && v !== '') p[k] = v;
  return p;
}
