import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { Observable ,of} from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError } from 'rxjs/operators';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

export interface Iva {
  id_iva: number;
  codigo_iva: number;
  descripcion: string;
  porcentaje: number;
  porcentaje_formateado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  esta_vigente: boolean;
  principal: boolean;
}

@Injectable({ providedIn: 'root' })
export class IvaService {
  private base = environment.invoices_sic+'/iva'; // ajusta tu base

  constructor(private http: HttpClient) {}

 getVigentes(): Observable<Iva[]> {
  const params = new HttpParams()
    .set('page', 1)        // o el que uses
    .set('pageSize', 200); // algo grande para cubrir todos

  return this.http
    .get<ApiResponse<PaginationResponse<Iva>>>(this.base, { params })
    .pipe(
      map(res => (res.data?.items ?? []).filter(iv => iv.esta_vigente === true)),
      catchError(() => of([]))
    );
}

}
