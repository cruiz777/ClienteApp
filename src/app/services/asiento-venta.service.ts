import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ===== DETALLE =====
// ===== DETALLE =====
export interface DetalleAsientoVentaRequest {
  IdDetMaestro: number;
  IdCabMaestro: number;
  numlinea: number;
  anio: string;
  fechatransaccion: string;
  fechaingreso: string;
  hora: string;
  idZona: number;
  idCentroCostos: number | null;
  idLocal: number;
  idPlanCuentas: number;
  codprePc: string;
  idCodContable: number;
  nocomprobante: string;
  docurelacionado: string;
  cheque: number;
  beneficiario: string;
  debe: number;
  haber: number;
  comentario: string;
  idMovBancario: number | null;
  movbancario: string;
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
  autorizacionRelacionado: string;
  fechaCadRelacionado: string | null;
}

// ===== CABECERA =====
export interface AsientoVentaRequest {
  IdCabMaestro: number;      // 0 al crear
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;            // 👈 ahora numérico
  anio: string;
  fechatransaccion: string;  // "2025-11-29T22:35:32"
  fechaingreso: string;      // "2025-11-29T22:37:09"
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
  modulo: number;            // 👈 NUEVO (0 en tu ejemplo)
  detalles: DetalleAsientoVentaRequest[];
}

// Respuesta genérica de tu API
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsientoVentaService {

  // ej: https://.../api
  private readonly baseUrl = `${environment.transactionUrl}`;

  constructor(private http: HttpClient) { }

  crearAsientoVenta(asiento: AsientoVentaRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.baseUrl + '/AsientosContables', asiento);
    //            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //            Nada de { asiento }, nada de JSON.stringify(asiento)
  }
}
