import { TipoAsientoResponse } from './../interfaces/responses/tipo-asiento-response';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  type: string;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipoAsientoService {

  private apiUrl = `${environment.balanceApiUrl}/TipoAsiento`;

  constructor(private http: HttpClient) { }

  getAllTipoAsiento(): Observable<ApiResponse<TipoAsientoResponse[]>> {
    return this.http.get<ApiResponse<TipoAsientoResponse[]>>(this.apiUrl)
  }

}
