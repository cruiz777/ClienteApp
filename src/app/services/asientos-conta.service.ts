// src/app/services/asientos-conta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AsientoContableDetalleRequest {
  idDetMaestro: number;     // 0 para crear
  idCabMaestro: number;     // 0 para crear
  numlinea: number;
  anio: string;

  fechatransaccion: string; // ISO
  hora: string;             // "HH:mm:ss"

  idZona: number;
  idCentroCostos?: number | null;
  idLocal?: number | null;

  idPlanCuentas: number;    // ✅ requerido
  codprePc: string;         // ✅ requerido (ej: "510301-003")
  idCodContable: number;    // ej: 28072

  nocomprobante?: string | null;
  docurelacionado?: string | null;

  cheque?: number | null;
  beneficiario?: string | null;

  debe: number;
  haber: number;

  comentario?: string | null;

  idMovBancario?: number | null;
  movbancario?: string | null;

  fechaingreso: string;     // ISO

  cierre?: string | null;
  fechacierre?: string | null;

  conciliado?: string | null;
  fechaconciliado?: string | null;

  idSustentoTrib?: number | null;
  idTipoCompSri?: number | null;
  autorizacion?: string | null;
  fechacaduca?: string | null;

  idTipoRetencion?: number | null;
  idProyecto?: number | null;
  idSubproyecto?: number | null;

  transferido?: boolean | null;
  fechatransferido?: string | null;

  fechavencimiento?: string | null;
  idConciliacion?: number | null;

  valorLetras?: string | null;
  estadoIngreso?: boolean | null;

  autorizacionRelacionado?: string | null;
  fechaCadRelacionado?: string | null;

  idPorIva?: number | null;
  porcentaje?: number | null;
}

export interface AsientoContableRequest {
  idCabMaestro: number;      // 0 crear
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;     // ✅ 3
  tipdoc: string;            // "AD"
  numdoc: number;            // 0 (si backend asigna)
  anio: string;

  fechatransaccion: string;  // ISO
  fechaingreso: string;      // ISO
  observacion: string;

  totdebe: number;
  tothaber: number;

  beneficiario?: string | null;

  cierre?: string | null;
  fechacierre?: string | null;

  solicitado?: string | null;
  depto?: string | null;
  autorizado?: string | null;

  homCodigo?: number | null;
  estado: boolean;
  modulo: number;

  detalles: AsientoContableDetalleRequest[];
}

export interface AsientoContableResponse {
  idCabMaestro?: number;
  tipdoc: string;
  numdoc: number;
  totdebe: number;
  tothaber: number;
  message?: string;
}

function extractErr(err: any): string {
  const raw = err?.error;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw?.message) return String(raw.message);
  if (err?.message) return String(err.message);
  return 'Ocurrió un error inesperado.';
}

@Injectable({ providedIn: 'root' })
export class AsientosContablesService {
  private readonly baseUrl = environment.transactionUrl; // debe apuntar a tu API (con /api si aplica)

  constructor(private http: HttpClient) {}

  crearAsiento(payload: AsientoContableRequest): Observable<AsientoContableResponse> {
    return this.http
      .post<AsientoContableResponse>(`${this.baseUrl}/AsientosContables`, payload)
      .pipe(
        catchError((err) => {
          console.error('[AsientosContablesService] crearAsiento error:', err);
          return throwError(() => new Error(extractErr(err)));
        })
      );
  }
}
