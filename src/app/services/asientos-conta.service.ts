// src/app/services/asientos-conta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
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
  idTipoAsiento: number;     // ✅ 3 (o el que uses)
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

/**
 * Tu API NO está devolviendo este shape directamente.
 * Lo devolvemos nosotros normalizado para que tu componente siempre reciba:
 * { tipdoc, numdoc, totdebe, tothaber, idCabMaestro, message }
 */
export interface AsientoContableResponse {
  idCabMaestro?: number;
  tipdoc: string;
  numdoc: number;
  totdebe: number;
  tothaber: number;
  message?: string;
}

/**
 * Respuesta real que estás recibiendo (según tu screenshot):
 * {
 *   "id": "...",
 *   "type": "CREATED",
 *   "data": 10313,
 *   "message": "Asiento creado. Cabecera Id=10313, Numdoc=26010027, detalles=8"
 * }
 */
interface ApiEnvelope<T> {
  id?: string;
  type?: string;
  data: T;
  message?: string;
}

function extractErr(err: any): string {
  const raw = err?.error;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw?.message) return String(raw.message);
  if (err?.message) return String(err.message);
  return 'Ocurrió un error inesperado.';
}

function parseNumdocFromMessage(msg?: string): number {
  if (!msg) return 0;
  // soporta "Numdoc=26010027" o "Numdoc: 26010027"
  const m = msg.match(/Numdoc\s*=\s*(\d+)/i) || msg.match(/Numdoc[:\s]+(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function parseCabeceraIdFromMessage(msg?: string): number | null {
  if (!msg) return null;
  const m = msg.match(/Cabecera\s*Id\s*=\s*(\d+)/i) || msg.match(/Cabecera\s*Id[:\s]+(\d+)/i);
  return m ? Number(m[1]) : null;
}

@Injectable({ providedIn: 'root' })
export class AsientosContablesService {
  private readonly baseUrl = environment.transactionUrl; // debe apuntar a tu API (con /api si aplica)

  constructor(private http: HttpClient) {}

  /**
   * Normaliza la respuesta del backend para que SIEMPRE tengas tipdoc/numdoc.
   * - idCabMaestro: viene en res.data (y/o en el message)
   * - numdoc: viene en el message => lo parseamos
   * - totales: los tomamos del payload (porque tu API no los está devolviendo como campos)
   */
  crearAsiento(payload: AsientoContableRequest): Observable<AsientoContableResponse> {
    return this.http
      .post<ApiEnvelope<number>>(`${this.baseUrl}/AsientosContables`, payload)
      .pipe(
        map((res) => {
          const numdoc = parseNumdocFromMessage(res?.message);
          const idCabFromMsg = parseCabeceraIdFromMessage(res?.message);
          const idCabMaestro = Number(res?.data ?? 0) || (idCabFromMsg ?? undefined);

          return {
            idCabMaestro,
            tipdoc: payload.tipdoc,
            numdoc,
            totdebe: payload.totdebe,
            tothaber: payload.tothaber,
            message: res?.message
          } as AsientoContableResponse;
        }),
        catchError((err) => {
          console.error('[AsientosContablesService] crearAsiento error:', err);
          return throwError(() => new Error(extractErr(err)));
        })
      );
  }
}