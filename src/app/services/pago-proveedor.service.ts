import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreatePagoProveedorRequest,
  FacturaPagoItem,
  FormaPagoItem
} from '../interfaces/requests/pago-proveedor-request';
import {
  ApiResponse,
  PaginationResponse,
  PagoProveedorResponse,
  FacturaPendienteResponse,
  CodigoContableSummaryResponse
} from '../interfaces/responses/pago-proveedor-response';

@Injectable({
  providedIn: 'root'
})
export class PagoProveedorService {
  private readonly baseUrl = `${environment.transactionUrl}/PagosProveedor`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene facturas pendientes de un proveedor
   */
  getFacturasPendientes(
    idEmpresa: number,
    idCodContable: number,
    fechaDesde?: Date,
    fechaHasta?: Date,
    soloVencidas: boolean = false
  ): Observable<ApiResponse<FacturaPendienteResponse[]>> {
    let params = new HttpParams();

    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde.toISOString());
    }
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta.toISOString());
    }
    if (soloVencidas) {
      params = params.set('soloVencidas', 'true');
    }

    return this.http.get<ApiResponse<FacturaPendienteResponse[]>>(
      `${this.baseUrl}/${idEmpresa}/${idCodContable}`,
      { params }
    );
  }

  /**
   * Busca códigos contables (proveedores) para autocomplete
   */
  searchProveedores(
    idEmpresa: number,
    searchTerm: string,
    page: number = 1,
    pageSize: number = 20
  ): Observable<ApiResponse<PaginationResponse<CodigoContableSummaryResponse>>> {
    const params = new HttpParams()
      .set('idEmpresa', idEmpresa.toString())
      .set('searchTerm', searchTerm)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<CodigoContableSummaryResponse>>>(
      `${this.baseUrl}/summary`,
      { params }
    );
  }

  /**
   * Registra un pago a proveedor con múltiples facturas y formas de pago
   */
  registrarPago(request: CreatePagoProveedorRequest): Observable<ApiResponse<PagoProveedorResponse>> {
    return this.http.post<ApiResponse<PagoProveedorResponse>>(
      this.baseUrl,
      request
    );
  }

  /**
   * Valida que la suma de facturas coincida con la suma de formas de pago
   */
  validatePago(request: CreatePagoProveedorRequest): { ok: boolean; diferencia: number } {
    const totalFacturas = request.facturas.reduce((sum, f) => sum + f.montoPagar, 0);
    const totalFormasPago = request.formasPago.reduce((sum, f) => sum + f.monto, 0);
    const diferencia = Math.abs(totalFacturas - totalFormasPago);

    return {
      ok: diferencia < 0.01,
      diferencia: diferencia
    };
  }
}
