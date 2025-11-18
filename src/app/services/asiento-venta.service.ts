import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ===== Interfaces de request =====
export interface DetalleAsientoVentaRequest {
  numlinea: number;
  anio: string;
  fechatransaccion: string;  // yyyy-MM-dd
  hora: string;
  idZona: number;
  idCentroCostos: number | null;
  idLocal: number;
  idPlanCuentas: number;
  codprePc: string;
  idCodContable: number | null;
  nocomprobante: string;
  docurelacionado: string;
  cheque: number;
  beneficiario: string;
  debe: number;
  haber: number;
  comentario: string;
  idMovBancario: number | null;
  movbancario: string;
  fechaingreso: string;
  cierre: string;
  fechacierre: string | null;
  conciliado: string;
  fechaconciliado: string | null;
  idSustentoTrib: number | null;
  idTipoCompSri: number | null;
  autorizacion: string;
  fechacaduca: string | null;
  idTipoRetencion: number | null;
  idProyecto: number | null;
  idSubproyecto: number | null;
  transferido: boolean;
  fechatransferido: string | null;
  fechavencimiento: string | null;
  idConciliacion: number | null;
  valorLetras: string;
  estadoIngreso: boolean;
}

export interface AsientoVentaRequest {
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: string;
  anio: string;
  fechatransaccion: string;   // yyyy-MM-dd
  fechaingreso: string;       // yyyy-MM-dd
  observacion: string;
  totdebe: number;
  tothaber: number;
  beneficiario: string;
  cierre: string;
  fechacierre: string | null;
  solicitado: string;
  depto: string;
  autorizado: string;
  homCodigo: number;
  estado: boolean;
  detalles: DetalleAsientoVentaRequest[];
}

// Si tu API envuelve respuestas (tipo, message, data, etc.)
export interface ApiResponse<T> {
  type: string;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AsientoVentaService {

  // 🔧 AJUSTA esta URL a tu microservicio de transacciones CG
  // por ejemplo: environment.transaccionesCgUrl o similar
  private readonly baseUrl = `${environment.transactionUrl}`;

  constructor(private http: HttpClient) { }

  /**
   * Crea un asiento contable de venta.
   * El payload debe venir ya armado (igual a tu JSON de ejemplo).
   */
  crearAsientoVenta(payload: AsientoVentaRequest): Observable<ApiResponse<boolean>> {
    // Ajusta el endpoint (/Create, /CrearVenta, etc.) según tu API
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/AsientosContables`,
      payload
    );
  }
}
