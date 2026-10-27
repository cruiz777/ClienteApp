import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable,map } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}
export interface AuditoriaTransferenciaRequest {
  clientesCodigoOrigen: number;
  clientesCodigoDestino: number;
  fecha: string; // formato ISO (ej. '2025-07-02T15:30:00Z')
  idPrefijos: number; // ahora es solo un ID (no arreglo)
  idUsuario: number;
  tipo: string;
}

export interface AuditoriaTransferenciaResponse {
  id_traferencia_prefijo: number;
  clientesCodigoOrigen: number;
  clientesCodigoDestino: number;
  fecha: string;
  idPrefijos: number;
  tipo: string;
  idUsuario: number;
  origen: string;
  rucOrigen: string;
  destino: string;
  rucDestino: string;
  usuario: string;
  prefijo: string;
}



@Injectable({
  providedIn: 'root'
})
export class AuditoriaTransferenciaService {
  private apiBaseUrl = environment.clientsUrl; // asegúrate de tener esta URL en environments

  constructor(private http: HttpClient) {}

  crearAuditoriaTransferencia(request: AuditoriaTransferenciaRequest): Observable<ApiResponse<boolean>> {
  return this.http.post<ApiResponse<boolean>>(
    `${this.apiBaseUrl}/AuditoriaTransferencia`,
    request // ⛔ sin el wrapper { request }
  );
}

  getAuditoriasTransferencia(): Observable<AuditoriaTransferenciaResponse[]> {
    return this.http
      .get<ApiResponse<AuditoriaTransferenciaResponse[]>>(`${this.apiBaseUrl}/AuditoriaTransferencia`)
      .pipe(map(resp => resp.data));
  }

}
