import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';

import {
  ApiResponse
} from 'src/app/interfaces/responses/api-response';

import {
  RpEmpresaComplementariaResponse
} from 'src/app/interfaces/responses/empresa-complementaria-response';

import {
  CreateRpEmpresaComplementariaRequest
} from 'src/app/interfaces/requests/empresa-complementaria.request';


@Injectable({
  providedIn: 'root'
})
export class EmpresaAdaptacionService {

  private readonly baseUrl =
    `${environment.maintenanceRolUrl}/RpEmpresaComplementaria`;


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ============================================================
  // LISTAR
  // ============================================================

  getAll():
    Observable<
      ApiResponse<
        RpEmpresaComplementariaResponse[]
      >
    > {

    return this.http.get<
      ApiResponse<
        RpEmpresaComplementariaResponse[]
      >
    >(
      this.baseUrl
    );

  }


  // ============================================================
  // OBTENER POR ID
  // ============================================================

  getById(
    id: number
  ):
    Observable<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    > {

    return this.http.get<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    >(
      `${this.baseUrl}/${id}`
    );

  }


  // ============================================================
  // CREAR
  // ============================================================

  create(
    request:
      CreateRpEmpresaComplementariaRequest
  ):
    Observable<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    > {

    return this.http.post<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    >(
      this.baseUrl,
      request
    );

  }


  // ============================================================
  // ACTUALIZAR
  // ============================================================

  update(
    id: number,
    request:
      CreateRpEmpresaComplementariaRequest
  ):
    Observable<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    > {

    return this.http.put<
      ApiResponse<
        RpEmpresaComplementariaResponse
      >
    >(
      `${this.baseUrl}/${id}`,
      request
    );

  }


  // ============================================================
  // ELIMINAR
  // ============================================================

  delete(
    id: number
  ):
    Observable<
      ApiResponse<boolean>
    > {

    return this.http.delete<
      ApiResponse<boolean>
    >(
      `${this.baseUrl}/${id}`
    );

  }

}