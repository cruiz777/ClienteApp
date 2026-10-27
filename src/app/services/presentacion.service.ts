import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

import { PresentacionResponse } from 'src/app/interfaces/responses/presentacion-response'

@Injectable({
  providedIn: 'root'
})

export class PresentacionService {

  private apiUrl = `${environment.inventoryUrl}/Presentacion`;
  constructor(private http: HttpClient) { }

  getPresentacion(): Observable<ApiResponse<PresentacionResponse[]>> {
    return this.http.get<ApiResponse<PresentacionResponse[]>>(this.apiUrl);
  }

}
