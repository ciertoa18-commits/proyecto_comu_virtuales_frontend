import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Archivo, Categoria, Idioma, Periodo, Pueblo } from '../modelos';

@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  readonly idiomas$ = this.http.get<Idioma[]>(`${this.url}/idiomas`).pipe(shareReplay(1));
  readonly categorias$ = this.http.get<Categoria[]>(`${this.url}/categorias`).pipe(shareReplay(1));
  readonly pueblos$ = this.http.get<Pueblo[]>(`${this.url}/pueblos`).pipe(shareReplay(1));
  periodos() {
    return this.http.get<Periodo[]>(`${this.url}/periodos`);
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
