import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment'; // 👈 asegúrate de importar esto
import { map } from 'rxjs';

// Define la interfaz del modelo (ajusta según tu backend)
export interface AuditoriaPrefijo {
  id?: number;
  codpre: string;
  usuario: string;
  fecha: string;
  empresa: string;
  ruc: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaPrefijosService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/AuditoriaPrefijos`; // ✅ CORREGIDO

  constructor(private http: HttpClient) {}

  // GET todos los registros
 obtenerTodosAuditoriaPrefijos(): Observable<AuditoriaPrefijo[]> {
  return this.http.get<{ data: AuditoriaPrefijo[] }>(this.apiUrl).pipe(
    map(resp => resp.data)
  );
}
  // POST nuevo registro
  insertarAuditoriaPrefijo(prefijo: AuditoriaPrefijo): Observable<any> {
    return this.http.post<any>(this.apiUrl, prefijo);
  }
}
