import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { EmpresaRequest } from '../interfaces/requests/empresa-request';
import { EmpresaResponse } from '../interfaces/responses/empresa-response';
import { AsignarGerenteContadorRequest } from '../interfaces/requests/asignar-gerente-contador';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { LogoFirmaResponse } from '../interfaces/responses/logo-firma-response';
export interface EmpresaComboResponse {
  idEmpresa: number;
  nombre: string;
  numPatronal: string;
}
@Injectable({
  providedIn: 'root'
})

export class EmpresaService {
  private apiUrl = `${environment.securityApiUrl}/Empresa`;
  private asignarUrl = `${environment.securityApiUrl}/GerenteContador`;

  constructor(private http: HttpClient) {}

  // Obtener listado de empresas
  getEmpresas(): Observable<EmpresaResponse[]> {
    return this.http.get<ApiListResponse<EmpresaResponse[]>>(this.apiUrl).pipe(
      map(response =>
        response.data.map(empresa => ({
          ...empresa,
          gerentes: empresa.gerentes?.map(g => ({
            ...g,
            status: true,
            empresaCodigo: empresa.empresaCodigo,
            nombreEmpresa: empresa.empresaNombre
          })),
          contadores: empresa.contadores?.map(c => ({
            ...c,
            status: true,
            empresaCodigo: empresa.empresaCodigo,
            nombreEmpresa: empresa.empresaNombre
          }))
        }))
      )
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
  //Devuelve el logo y la firma parametrizados en la base

  //Precaucion, si se cambia algun valor de la ruta o del reponse, no funcionarian los logos ni firmas en todo el sistema
  getLogoFirma(idEmpresa: number): Observable<LogoFirmaResponse> {
    return this.http
      .get<ApiListResponse<LogoFirmaResponse>>(`${this.apiUrl}/${idEmpresa}/logo-firma`)
      .pipe(map(response => response.data));
  }
  getCombo(): Observable<EmpresaComboResponse[]> {
    return this.http
      .get<ApiListResponse<EmpresaComboResponse[]>>(`${this.apiUrl}/combo`)
      .pipe(map(response => response.data));
  }
}
