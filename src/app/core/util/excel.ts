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

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function crearZip(archivos: [string, string][]): Blob {
  const cod = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const [nombre, texto] of archivos) {
    const n = cod.encode(nombre);
    const d = cod.encode(texto);
    const crc = crc32(d);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, FIRMA_LOCAL, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, d.length, true);
    local.setUint32(22, d.length, true);
    local.setUint16(26, n.length, true);
    partes.push(new Uint8Array(local.buffer), n, d);
    const cab = new DataView(new ArrayBuffer(46));
    cab.setUint32(0, FIRMA_CENTRAL, true);
    cab.setUint16(4, 20, true);
    cab.setUint16(6, 20, true);
    cab.setUint32(16, crc, true);
    cab.setUint32(20, d.length, true);
    cab.setUint32(24, d.length, true);
    cab.setUint16(28, n.length, true);
    cab.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cab.buffer), n);
    desplazamiento += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, FIRMA_FIN, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, desplazamiento, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function crearExcel(filas: string[][]): Blob {
  const letra = (i: number) => String.fromCharCode(65 + i);
  const hoja = filas
    .map((f, r) => `<row r="${r + 1}">${f.map((v, c) => `<c r="${letra(c)}${r + 1}" t="inlineStr"><is><t>${escapar(v)}</t></is></c>`).join('')}</row>`)
    .join('');
  return crearZip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Comunidades" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${hoja}</sheetData></worksheet>`],
  ]);
}
