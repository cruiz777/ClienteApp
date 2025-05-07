import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SistemaResponse } from '../interfaces/responses/sistema-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class SistemaService {
  private apiUrl = `${environment.applicationUrl}/Sistemas`;

  constructor(private http: HttpClient) {}

  getSistemas(): Observable<ApiResponse<SistemaResponse[]>> {
    return this.http.get<ApiResponse<SistemaResponse[]>>(this.apiUrl);
  }
}
