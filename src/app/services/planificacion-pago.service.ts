import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DocumentoPendienteResponse, PagoProcesadoResponse, PlanificacionCreadaResponse, PlanificacionPagoResponse } from '../interfaces/responses/planificacion-pago-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { AprobarPlanificacionRequest, DocumentoPendienteRequest, ProcesarPagoRequest } from '../interfaces/requests/planificacion-pago-response';

@Injectable({
  providedIn: 'root'
})
export class PlanificacionPagoService {
  private readonly baseUrl = `${environment.cxpUrl}/PlanificacionPago`;

  constructor(private http: HttpClient) {}

    /**
     * Obtiene documentos pendientes de pago con filtros opcionales
     */
    getDocumentosPendientes(
        request: DocumentoPendienteRequest
    ): Observable<ApiResponse<DocumentoPendienteResponse[]>> {
        let params = new HttpParams()
        .set('idEmpresa', request.id_empresa.toString());

        if (request.id_proveedor) {
        params = params.set('idProveedor', request.id_proveedor.toString());
        }

        if (request.fecha_vencimiento_hasta) {
        params = params.set('fechaVencimientoHasta', request.fecha_vencimiento_hasta);
        }

        if (request.cuentas_contables && request.cuentas_contables.length > 0) {
        request.cuentas_contables.forEach(cuenta => {
            params = params.append('cuentasContables', cuenta);
        });
        }

        return this.http.get<ApiResponse<DocumentoPendienteResponse[]>>(
        `${this.baseUrl}/documentos-pendientes`,
        { params }
        );
    }


    /**
     * Crea planificación de pago (NO genera asientos contables)
     */
    planificarPago(
        request: ProcesarPagoRequest  // ✅ AHORA USA ESTE TIPO
    ): Observable<ApiResponse<PlanificacionCreadaResponse>> {
        return this.http.post<ApiResponse<PlanificacionCreadaResponse>>(
            `${this.baseUrl}/planificar-pago`,
            request
        );
    }

    /**
     * 3. Aprobar planificación (genera asientos)
     */
    aprobarPlanificacion(
    request: AprobarPlanificacionRequest
    ): Observable<ApiResponse<PagoProcesadoResponse>> {
    return this.http.post<ApiResponse<PagoProcesadoResponse>>(
        `${this.baseUrl}/aprobar-pago`,
        request
    );
    }
    /**
 * Obtiene planificaciones pendientes de aprobación
 */
    getPlanificacionesPendientes(
    idEmpresa: number,
    idProveedor?: number,
    fechaDesde?: string,
    fechaHasta?: string,
    estadoPlanificacion?: number
    ): Observable<ApiResponse<PlanificacionPagoResponse[]>> {
    let params = new HttpParams()
        .set('idEmpresa', idEmpresa.toString());

    if (idProveedor) {
        params = params.set('idProveedor', idProveedor.toString());
    }

    if (fechaDesde) {
        params = params.set('fechaDesde', fechaDesde);
    }

    if (fechaHasta) {
        params = params.set('fechaHasta', fechaHasta);
    }

    if (estadoPlanificacion !== undefined) {
        params = params.set('estadoPlanificacion', estadoPlanificacion.toString());
    }

    return this.http.get<ApiResponse<PlanificacionPagoResponse[]>>(
        `${this.baseUrl}/planificaciones-pendientes`,
        { params }
    );
    }
}