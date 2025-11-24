import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ListadoAsientoContableResponse } from '../interfaces/responses/asientos-contables-response';
import { AsientoContableResponse } from '../interfaces/responses/asiento-contable-response';

/** ===== Respuesta estándar del API ===== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

/** ===== Tipos internos para el payload que exige tu API ===== */
interface CreateDetalleRequest {
  numlinea: number;
  anio: string;
  fechatransaccion: string | null;
  hora: string | null;
  idZona: number;
  idCentroCostos: number | null;
  idLocal: number | null;
  idPlanCuentas: number | null;
  codprePc: string | null;
  idCodContable: number | null;
  nocomprobante: string | null;
  docurelacionado: string | null;
  cheque: number | null;
  beneficiario: string | null;
  debe: number;
  haber: number;
  comentario: string | null;
  idMovBancario: number | null;
  movbancario: string | null;
  fechaingreso: string | null;
  cierre: string | null;
  fechacierre: string | null;
  conciliado: string | null;
  fechaconciliado: string | null;
  idSustentoTrib: number | null;
  idTipoCompSri: number | null;
  autorizacion: string | null;
  fechacaduca: string | null;
  idTipoRetencion: number | null;
  idProyecto: number | null;
  idSubproyecto: number | null;
  transferido: boolean;
  fechatransferido: string | null;
  fechavencimiento: string | null;
  idConciliacion: number | null;
  valorLetras: string | null;
  estadoIngreso: boolean;
  autorizacionRelacionado: string | null;
  fechaCadRelacionado: string | null;
}

interface CreateAsientoRequest {
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;
  anio: string;
  fechatransaccion: string; // YYYY-MM-DD
  fechaingreso: string;     // YYYY-MM-DD
  observacion: string | null;
  totdebe: number;
  tothaber: number;
  beneficiario: string | null;
  cierre: string | null;
  fechacierre: string | null;
  solicitado: string | null;
  depto: string | null;
  autorizado: string | null;
  homCodigo: number | null;
  estado: boolean;
  detalles: CreateDetalleRequest[];
}
/** ============================================================= */

@Injectable({ providedIn: 'root' })
export class AsientosContablesService {
  private readonly baseUrl = `${environment.transactionUrl}/AsientosContables`;

  constructor(private http: HttpClient) {}

  /** ==== LISTADO ==== */
  private mapItem = (x: any): ListadoAsientoContableResponse => ({
    idCabMaestro: Number(x?.idCabMaestro ?? x?.IdCabMaestro ?? 0),
    empresa: x?.empresa ?? x?.Empresa ?? null,
    tipoAsientoCompleto: x?.tipoAsientoCompleto ?? x?.TipoAsientoCompleto ?? null,
    beneficiario: x?.beneficiario ?? x?.Beneficiario ?? null,
    numdoc: Number(x?.numdoc ?? x?.Numdoc ?? 0),
    totdebe: Number(x?.totdebe ?? x?.Totdebe ?? 0),
    tothaber: Number(x?.tothaber ?? x?.Tothaber ?? 0),
    fechatransaccion: x?.fechatransaccion ?? x?.Fechatransaccion ?? null,
    fechaingreso: x?.fechaingreso ?? x?.Fechaingreso ?? null,
    observacion: x?.observacion ?? x?.Observacion ?? null,
    idEmpresa: Number(x?.idEmpresa ?? x?.IdEmpresa ?? 0),
    estado: Boolean(x?.estado ?? x?.Estado ?? true),
  });

  GetListado(): Observable<ListadoAsientoContableResponse[]> {
    return this.http.get<any>(`${this.baseUrl}/listado`).pipe(
      map(raw => {
        const items: any[] =
          Array.isArray(raw) ? raw
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.Data) ? raw.Data
          : Array.isArray(raw?.result) ? raw.result
          : Array.isArray(raw?.items) ? raw.items
          : [];
        return items.map(this.mapItem);
      }),
      catchError(err => {
        console.error('GetListado error', err);
        return of([]);
      })
    );
  }

  /** ==== GET BY ID ==== */
  getById(idCabMaestro: number): Observable<AsientoContableResponse> {
    return this.http.get<AsientoContableResponse>(`${this.baseUrl}/GetById/${idCabMaestro}`).pipe(
      catchError(err => {
        console.error('[AsientosContablesService.getById] Error:', err);
        return of({
          IdCabMaestro: 0,
          idZona: 0, idUsuario: 0, idEmpresa: 0, idTipoAsiento: 0,
          tipdoc: '', numdoc: 0, anio: '',
          fechatransaccion: new Date().toISOString(),
          fechaingreso: new Date().toISOString(),
          observacion: '', totdebe: 0, tothaber: 0,
          beneficiario: '', cierre: '', fechacierre: new Date().toISOString(),
          solicitado: '', depto: '', autorizado: '',
          homCodigo: 0, estado: true, detalles: []
        } as AsientoContableResponse);
      })
    );
  }

  /** ===== helpers ===== */
  private dateOnly(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).substring(0, 10);
    return d.toISOString().substring(0, 10);
  }

  private dateTimeIso(value: any): string | null {
    if (!value) return null;

    // Si ya viene como string con 'T' desde el componente,
    // asumimos que viene en el formato correcto (2025-11-19T10:17:35)
    if (typeof value === 'string' && value.includes('T')) {
      // Por si viniera con 'Z' al final, la quitamos
      return value.replace('Z', '');
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) {
      // si no se puede convertir a Date, devolvemos null
      return null;
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    // Ej: 2025-11-19T14:37:52  (SIN Z)
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  private toNull<T>(v: T | null | undefined, emptyAsNull = true): T | null {
    if (v === undefined || v === null) return null;
    if (emptyAsNull && (v as any) === '') return null;
    if (emptyAsNull && typeof v === 'number' && Number(v) === 0) return null;
    return v as any;
  }

  /** Mapea tu modelo UI -> payload API (aquí forzamos null en IDs = 0) */
  private mapToCreateRequest(h: AsientoContableResponse): CreateAsientoRequest {
    const detalles: CreateDetalleRequest[] = (h.detalles ?? []).map(d => ({
      numlinea: d.numlinea,
      anio: d.anio ?? '',
      fechatransaccion: this.dateOnly(d.fechatransaccion),
      hora: this.toNull(d.hora),
      idZona: d.idZona ?? 0,
      idCentroCostos: this.toNull(d.idCentroCostos),
      idLocal: this.toNull(d.idLocal),
      idPlanCuentas: this.toNull(d.idPlanCuentas),
      codprePc: this.toNull(d.codprePc),
      idCodContable: this.toNull(d.idCodContable),
      nocomprobante: this.toNull(d.nocomprobante),
      docurelacionado: this.toNull(d.docurelacionado),
      cheque: this.toNull(d.cheque),
      beneficiario: this.toNull(d.beneficiario, false),
      debe: Number(d.debe || 0),
      haber: Number(d.haber || 0),
      comentario: this.toNull(d.comentario, false),
      idMovBancario: this.toNull(d.idMovBancario),
      movbancario: this.toNull(d.movbancario, false),
      fechaingreso: this.dateTimeIso(d.fechaingreso),
      cierre: this.toNull(d.cierre, false),
      fechacierre: this.dateOnly(d.fechacierre),
      conciliado: this.toNull(d.conciliado, false),
      fechaconciliado: this.dateOnly(d.fechaconciliado),
      idSustentoTrib: this.toNull(d.idSustentoTrib),
      idTipoCompSri: this.toNull(d.idTipoCompSri),
      autorizacion: this.toNull(d.autorizacion, false),
      fechacaduca: this.dateOnly(d.fechacaduca),
      idTipoRetencion: this.toNull(d.idTipoRetencion),
      idProyecto: this.toNull(d.idProyecto),
      idSubproyecto: this.toNull(d.idSubproyecto),
      transferido: !!d.transferido,
      fechatransferido: this.dateOnly(d.fechatransferido),
      fechavencimiento: this.dateOnly(d.fechavencimiento),
      idConciliacion: this.toNull(d.idConciliacion),
      valorLetras: this.toNull(d.valorLetras, false),
      estadoIngreso: !!d.estadoIngreso,
      autorizacionRelacionado: this.toNull(d.autorizacionRelacionado, false),
      fechaCadRelacionado: this.dateOnly(d.fechaCadRelacionado),
    }));

    return {
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: h.idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,               // en "nuevo" el componente pondrá 0
      anio: h.anio,
      fechatransaccion: this.dateOnly(h.fechatransaccion)!,
      fechaingreso: this.dateTimeIso(h.fechaingreso)!,
      observacion: this.toNull(h.observacion, false),
      totdebe: Number(h.totdebe || 0),
      tothaber: Number(h.tothaber || 0),
      beneficiario: this.toNull(h.beneficiario, false),
      cierre: this.toNull(h.cierre, false),
      fechacierre: this.dateOnly(h.fechacierre),
      solicitado: this.toNull(h.solicitado, false),
      depto: this.toNull(h.depto, false),
      autorizado: this.toNull(h.autorizado, false),
      homCodigo: this.toNull(h.homCodigo),
      estado: !!h.estado,
      detalles,
    };
  }

  /** ===== Crear (POST) ===== */
  crear(formValue: AsientoContableResponse): Observable<ApiResponse<boolean>> {
    const body: CreateAsientoRequest = this.mapToCreateRequest(formValue);
    return this.http.post<ApiResponse<boolean>>(this.baseUrl, body);
  }

  /** ===== Actualizar (PUT) ===== */
  actualizar(idCabMaestro: number, formValue: AsientoContableResponse): Observable<ApiResponse<boolean>> {
    const body: CreateAsientoRequest = this.mapToCreateRequest(formValue);
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/Update/${idCabMaestro}`, body);
  }

  /** ===== Eliminar (DELETE) ===== */
  eliminar(idCabMaestro: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/Delete/${idCabMaestro}`);
  }
}
