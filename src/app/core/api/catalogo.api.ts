import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Archivo, Categoria, DatosCategoria, DatosIdioma, DatosPueblo, Idioma, Periodo, Pueblo, TipoCatalogo } from '../modelos';

@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;
  private readonly cambios = {
    idiomas: new BehaviorSubject<void>(undefined),
    categorias: new BehaviorSubject<void>(undefined),
    pueblos: new BehaviorSubject<void>(undefined),
  };

  readonly idiomas$ = this.cambios.idiomas.pipe(switchMap(() => this.http.get<Idioma[]>(`${this.url}/idiomas`)), shareReplay(1));
  readonly categorias$ = this.cambios.categorias.pipe(switchMap(() => this.http.get<Categoria[]>(`${this.url}/categorias`)), shareReplay(1));
  readonly pueblos$ = this.cambios.pueblos.pipe(switchMap(() => this.http.get<Pueblo[]>(`${this.url}/pueblos`)), shareReplay(1));

  periodos() {
    return this.http.get<Periodo[]>(`${this.url}/periodos`);
  }

  crearCategoria(d: DatosCategoria) {
    return this.http.post<Categoria>(`${this.url}/categorias`, d).pipe(tap(() => this.cambios.categorias.next()));
  }
  editarCategoria(id: number, d: DatosCategoria) {
    return this.http.put<Categoria>(`${this.url}/categorias/${id}`, d).pipe(tap(() => this.cambios.categorias.next()));
  }
  crearIdioma(d: DatosIdioma) {
    return this.http.post<Idioma>(`${this.url}/idiomas`, d).pipe(tap(() => this.cambios.idiomas.next()));
  }
  editarIdioma(id: number, d: DatosIdioma) {
    return this.http.put<Idioma>(`${this.url}/idiomas/${id}`, d).pipe(tap(() => this.cambios.idiomas.next()));
  }
  crearPueblo(d: DatosPueblo) {
    return this.http.post<Pueblo>(`${this.url}/pueblos`, d).pipe(tap(() => this.cambios.pueblos.next()));
  }
  editarPueblo(id: number, d: DatosPueblo) {
    return this.http.put<Pueblo>(`${this.url}/pueblos/${id}`, d).pipe(tap(() => this.cambios.pueblos.next()));
  }
  eliminar(tipo: TipoCatalogo, id: number) {
    return this.http.delete<void>(`${this.url}/${tipo}/${id}`).pipe(tap(() => this.cambios[tipo].next()));
  }

  subirArchivo(archivo: File) {
    const f = new FormData();
    f.append('archivo', archivo);
    return this.http.post<Archivo>(`${this.url}/archivos`, f);
  }
  descargar(idArchivo: number) {
    return this.http.get(`${this.url}/archivos/${idArchivo}/descarga`, { responseType: 'blob' });
  }
  datosArchivo(idArchivo: number) {
    return this.http.get<Archivo>(`${this.url}/archivos/${idArchivo}`);
  }
}
