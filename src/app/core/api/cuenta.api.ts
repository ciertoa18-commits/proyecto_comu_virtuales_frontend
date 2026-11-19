import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DatosPerfil, DatosRegistro, Persona, RespuestaCuenta, Usuario } from '../modelos';

@Injectable({ providedIn: 'root' })
export class CuentaApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  registrar(d: DatosRegistro) {
    return this.http.post<RespuestaCuenta>(`${this.url}/auth/registro`, d);
  }
  pedirCodigo(correo: string) {
    return this.http.post<RespuestaCuenta>(`${this.url}/auth/recuperacion`, { correo });
  }
  restablecer(correo: string, codigo: string, nueva: string) {
    return this.http.post<RespuestaCuenta>(`${this.url}/auth/restablecer`, { correo, codigo, nueva });
  }

  yo() {
    return this.http.get<{ usuario: Usuario; rol: string }>(`${this.url}/me`);
  }
  guardarPerfil(d: DatosPerfil) {
    return this.http.put<Usuario>(`${this.url}/me`, d);
  }
  cambiarPassword(actual: string, nueva: string) {
    return this.http.put<void>(`${this.url}/me/password`, { actual, nueva });
  }
  cambiarFoto(archivo: File) {
    const f = new FormData();
    f.append('archivo', archivo);
    return this.http.put<Usuario>(`${this.url}/me/foto`, f);
  }
  persona(id: number) {
    return this.http.get<Persona>(`${this.url}/usuarios/${id}/publico`);
  }
}
