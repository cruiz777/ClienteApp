import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface RpEmpresaComplementaria {
  idEmpresaComplementaria: number;
  empresa: string;
  ruc: string | null;
  estado: boolean;
}

export interface ApiResponseEmpresaComplementaria {
  id: string;
  type: string;
  data: RpEmpresaComplementaria[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RpEmpresaComplementariaService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpEmpresaComplementaria`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RpEmpresaComplementaria[]> {
    return this.http
      .get<ApiResponseEmpresaComplementaria>(this.apiUrl)
      .pipe(map(resp => resp.data ?? []));
  }

  getAllResponse(): Observable<ApiResponseEmpresaComplementaria> {
    return this.http.get<ApiResponseEmpresaComplementaria>(this.apiUrl);
  }
}