import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TipoDocumento } from '../interfaces/catalogs/tipo-documento.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';


@Injectable({ providedIn: 'root' })
export class TipoDocumentoService {
  private apiUrl = `${environment.securityApiUrl}/TipoDocumento`;

  constructor(private http: HttpClient) {}

  getTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<ApiListResponse<TipoDocumento[]>>(this.apiUrl).pipe(
              map(response => response.data)  // Solo devuelve el array de géneros
    );
  }
}
