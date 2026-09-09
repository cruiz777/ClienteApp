import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T | null;
  message: string;
}

export interface EjecutarJobRequest {
  nombreJob: string;
}

export interface EjecutarJobResponse {
  nombreJob: string;
  ejecutado: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly baseUrl = environment.conciliacionUrl+'/Jobs';

  constructor(private http: HttpClient) {}

  ejecutarJob(nombreJob: string): Observable<ApiResponse<EjecutarJobResponse>> {
    const payload: EjecutarJobRequest = { nombreJob };
    return this.http.post<ApiResponse<EjecutarJobResponse>>(
      `${this.baseUrl}/ejecutar`,
      payload
    );
  }

  ejecutarRespaldo(): Observable<ApiResponse<EjecutarJobResponse>> {
    return this.ejecutarJob('Respaldo');
  }
}