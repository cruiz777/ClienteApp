import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { 
  FondosReservaRequest, 
  GrabarFondosReservaRequest 
} from 'src/app/interfaces/requests/fondos-reserva-request';
import { FondosReservaResponse } from 'src/app/interfaces/responses/fondos-reserva-response';

@Injectable({
  providedIn: 'root'
})
export class FondosReservaService {

  private readonly baseUrl = `${environment.nominaEspecialUrl}/FondosReserva`;

  constructor(private http: HttpClient) {}

  calcular(request: FondosReservaRequest): Observable<ApiResponse<FondosReservaResponse[]>> {
    return this.http.post<ApiResponse<FondosReservaResponse[]>>(
      `${this.baseUrl}/calcular`, request
    );
  }

  grabar(request: GrabarFondosReservaRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/grabar`, request
    );
  }
  // fondos-reserva.service.ts

    existe(numPatronal: string, periodo: string, idTipoNomEsp: number): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
        `${this.baseUrl}/existe`, {
        params: { numPatronal, periodo, idTipoNomEsp }
        }
    );
    }

    recuperar(numPatronal: string, periodo: string, idTipoNomEsp: number): Observable<ApiResponse<FondosReservaResponse[]>> {
    return this.http.get<ApiResponse<FondosReservaResponse[]>>(
        `${this.baseUrl}/recuperar`, {
        params: { numPatronal, periodo, idTipoNomEsp }
        }
    );
    }
}