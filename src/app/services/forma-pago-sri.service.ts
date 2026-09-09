// src/app/services/forma-pago-cg.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FormaPagoSriResponse } from '../interfaces/responses/formapagosri-response';
//import { ApiResponse } from '../interfaces/responses/ApiResponse'; // ajusta la ruta si es distinta

/** ===== Respuesta estándar del API ===== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}


@Injectable({ providedIn: 'root' })
export class FormaPagoSriService {

  // 🔹 Ajusta esta URL a tu microservicio de transacciones
  // Ejemplo: http://localhost:5070/transaction/api/FormaPagoCg
  private readonly baseUrl = `${environment.transactionUrl}/FormaPagoSri`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las formas de pago filtradas por empresa.
   * Si no se envía idEmpresa, trae todas.
   * Llama a: GET /FormaPagoCg?idEmpresa=XX
   */
   getAll(): Observable<FormaPagoSriResponse[]> {
    return this.http
      .get<ApiResponse<FormaPagoSriResponse[]>>(this.baseUrl)
      .pipe(
        map(resp => resp?.data ?? []),
        catchError(err => {
          console.error('Error al cargar formas de pago SRI', err);
          return of([] as FormaPagoSriResponse[]);
        })
      );
  }
  /**
   * Obtener una forma de pago por ID
   * Llama a: GET /FormaPagoCg/{id}
   */
  getById(id: number): Observable<FormaPagoSriResponse | null> {
    return this.http
      .get<ApiResponse<FormaPagoSriResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(resp => resp.data ?? null),
        catchError(err => {
          console.error(`Error al cargar forma de pago CG id=${id}`, err);
          return of(null);
        })
      );
  }

  //pendiente los otros metodos dependiendo de lo requerido
  
}
