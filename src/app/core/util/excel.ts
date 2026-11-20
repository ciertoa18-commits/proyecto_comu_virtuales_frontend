const FIRMA_FIN = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_LOCAL = 0x04034b50;

async function inflar(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function abrirZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const vista = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let fin = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (vista.getUint32(i, true) === FIRMA_FIN) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error('El archivo no es un Excel válido (.xlsx).');
  const total = vista.getUint16(fin + 10, true);
  let p = vista.getUint32(fin + 16, true);
  const archivos = new Map<string, Uint8Array>();
  const texto = new TextDecoder();
  for (let k = 0; k < total; k++) {
    if (vista.getUint32(p, true) !== FIRMA_CENTRAL) break;
    const metodo = vista.getUint16(p + 10, true);
    const tamano = vista.getUint32(p + 20, true);
    const largoNombre = vista.getUint16(p + 28, true);
    const largoExtra = vista.getUint16(p + 30, true);
    const largoComentario = vista.getUint16(p + 32, true);
    const local = vista.getUint32(p + 42, true);
    const nombre = texto.decode(bytes.subarray(p + 46, p + 46 + largoNombre));
    p += 46 + largoNombre + largoExtra + largoComentario;
    if (!nombre.endsWith('.xml') || vista.getUint32(local, true) !== FIRMA_LOCAL) continue;
    const inicio = local + 30 + vista.getUint16(local + 26, true) + vista.getUint16(local + 28, true);
    const datos = bytes.subarray(inicio, inicio + tamano);
    archivos.set(nombre, metodo === 8 ? await inflar(datos) : datos);
  }
  return archivos;
}

function columna(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function leerExcel(buffer: ArrayBuffer): Promise<string[][]> {
  const zip = await abrirZip(buffer);
  const texto = new TextDecoder();
  const xml = (nombre: string) => {
    const d = zip.get(nombre);
    return d ? new DOMParser().parseFromString(texto.decode(d), 'application/xml') : null;
  };
  const compartidos = Array.from(xml('xl/sharedStrings.xml')?.getElementsByTagName('si') ?? []).map((si) =>
    Array.from(si.getElementsByTagName('t'))
      .map((t) => t.textContent ?? '')
      .join(''),
  );
  const nombreHoja = [...zip.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const hoja = nombreHoja ? xml(nombreHoja) : null;
  if (!hoja) throw new Error('El Excel no tiene hojas.');
  const filas: string[][] = [];
  for (const fila of Array.from(hoja.getElementsByTagName('row'))) {
    const valores: string[] = [];
    for (const c of Array.from(fila.getElementsByTagName('c'))) {
      const tipo = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let valor = v;
      if (tipo === 's') valor = compartidos[Number(v)] ?? '';
      else if (tipo === 'inlineStr') valor = Array.from(c.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('');
      valores[columna(c.getAttribute('r') ?? 'A1')] = valor.trim();
    }
    filas.push(Array.from(valores, (x) => x ?? ''));
  }
  return filas.filter((f) => f.some((x) => x !== ''));
}
