
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EliminarClienteResponse {
  success: boolean;
  estado: string;
  message: string;
  clientesCodigo: number;
  totalProductos: number;
  totalDatosAdicionales: number;
  totalCodigos14: number;
  totalPrefijos: number;
  totalGln: number;
}

@Injectable({
  providedIn: 'root'
})
export class EliminarClienteService {

  // Ajustar a la propiedad real de environment.
  // Debe apuntar a la URL base de validaciones.
  private readonly apiUrl =
    `${environment.validationUrl}/ClientesLicenses`;

  constructor(
    private http: HttpClient
  ) {}

  eliminarCliente(
    clientesCodigo: number
  ): Observable<EliminarClienteResponse> {

    return this.http.delete<EliminarClienteResponse>(
      `${this.apiUrl}/eliminar/${clientesCodigo}`
    );
  }
}
