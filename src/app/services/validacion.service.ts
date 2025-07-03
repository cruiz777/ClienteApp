import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

export interface UpdateClienteRequest {
  razonSocial?: string;
  nomCli?: string;
  representante?: string;
  idEstadoEmpresa?: number;
  fechaCeseAct?: string | null; // Permitir null explícitamente
  motivoCeseAct?: string;
  fecnac?: string | null; // Permitir null explícitamente
}

@Injectable({
  providedIn: 'root',
})
export class ValidacionService {
  private baseUrl = environment.validationUrl; // Ajusta la URL base

  constructor(private http: HttpClient) {}

    updateCliente(idCliente: number, request: UpdateClienteRequest): Observable<ApiListResponse<boolean>> {
    return this.http.put<ApiListResponse<boolean>>(`${this.baseUrl}/Clientes/validacion/${idCliente}`, request);
    }
}
