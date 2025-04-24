import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { EmpresaRequest } from '../interfaces/requests/empresa-request';
import { EmpresaResponse } from '../interfaces/responses/empresa-response';
import { AsignarGerenteContadorRequest } from '../interfaces/requests/asignar-gerente-contador';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private apiUrl = `${environment.applicationUrl}/Empresa`;
  private asignarUrl = `${environment.applicationUrl}/GerenteContador`;

  constructor(private http: HttpClient) {}

  // Obtener listado de empresas
  getEmpresas(): Observable<EmpresaResponse[]> {
    return this.http.get<ApiListResponse<EmpresaResponse[]>>(this.apiUrl).pipe(
      map(response => response.data.map(empresa => ({
        ...empresa,
        gerentes: empresa.gerentes?.map(g => ({
          empresaCodigo: empresa.empresaCodigo,
          nombreEmpresa: empresa.empresaNombre,
          idPersona: g.idPersona,
          nombreCompleto: g.nombreCompleto,
          fechaInicio: g.fechaInicio,
          fechaFin: undefined,
          status: true
        })),
        contadores: empresa.contadores?.map(c => ({
          empresaCodigo: empresa.empresaCodigo,
          nombreEmpresa: empresa.empresaNombre,
          idPersona: c.idPersona,
          nombreCompleto: c.nombreCompleto,
          fechaInicio: c.fechaInicio,
          fechaFin: undefined,
          status: true
        }))
      })))
    );
  }


  // Obtener empresa por ID
  getEmpresaById(id: number): Observable<EmpresaResponse> {
    return this.http.get<ApiListResponse<EmpresaResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Crear empresa
  createEmpresa(empresa: EmpresaRequest): Observable<any> {
    return this.http.post<ApiListResponse<any>>(this.apiUrl, empresa).pipe(
      map(response => response.data)
    );
  }

  // Actualizar empresa
  updateEmpresa(id: number, empresa: EmpresaRequest): Observable<any> {
    return this.http.put<ApiListResponse<any>>(`${this.apiUrl}/${id}`, empresa).pipe(
      map(response => response.data)
    );
  }

  // Eliminación lógica
  softDeleteEmpresa(id: number): Observable<any> {
    return this.http.delete<ApiListResponse<any>>(`${this.apiUrl}/soft/${id}`).pipe(
      map(response => response.data)
    );
  }

  // Asignar Gerente/Contador
  asignarGerenteContador(data: AsignarGerenteContadorRequest): Observable<any> {
    return this.http.post<ApiListResponse<any>>(this.asignarUrl, data).pipe(
      map(response => response.data)
    );
  }
}
