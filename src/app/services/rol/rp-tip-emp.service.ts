import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
}

export interface RpTipEmpResponse {
  idTipemp: number;
  desTipemp: string;
  ctaCbleSue1: string;
  ctaCbleSue2: string;
  ctaCbleSue3: string;
  ctaCbleSue4: string;
  ctaCbleSue5: string;
  swRelDep: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RpTipEmpService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpTipEmp`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RpTipEmpResponse[]> {
    return this.http
      .get<ApiResponse<RpTipEmpResponse[]>>(this.apiUrl)
      .pipe(
        map(resp => resp?.data ?? [])
      );
  }

  getResponse(): Observable<ApiResponse<RpTipEmpResponse[]>> {
    return this.http.get<ApiResponse<RpTipEmpResponse[]>>(this.apiUrl);
  }
}