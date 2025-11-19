import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ListadoAsientoContableResponse } from '../interfaces/responses/asientos-contables-response';
import { AsientoContableResponse } from '../interfaces/responses/asiento-contable-response';

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
      idCentroCostos: this.toNull(d.idCentroCostos),   // ✅ 0 -> null
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
      fechaingreso: this.dateOnly(d.fechaingreso),
      cierre: this.toNull(d.cierre, false),
      fechacierre: this.dateOnly(d.fechacierre),
      conciliado: this.toNull(d.conciliado, false),
      fechaconciliado: this.dateOnly(d.fechaconciliado),
      idSustentoTrib: this.toNull(d.idSustentoTrib),   // ✅ 0 -> null
      idTipoCompSri: this.toNull(d.idTipoCompSri),     // ✅ 0 -> null
      autorizacion: this.toNull(d.autorizacion, false),
      fechacaduca: this.dateOnly(d.fechacaduca),
      idTipoRetencion: this.toNull(d.idTipoRetencion), // ✅ 0 -> null
      idProyecto: this.toNull(d.idProyecto),           // ✅ 0 -> null
      idSubproyecto: this.toNull(d.idSubproyecto),     // ✅ 0 -> null
      transferido: !!d.transferido,
      fechatransferido: this.dateOnly(d.fechatransferido),
      fechavencimiento: this.dateOnly(d.fechavencimiento),
      idConciliacion: this.toNull(d.idConciliacion),   // ✅ 0 -> null
      valorLetras: this.toNull(d.valorLetras, false),
      estadoIngreso: !!d.estadoIngreso,
    }));

    return {
      idZona: h.idZona,
      idUsuario: h.idUsuario,
      idEmpresa: h.idEmpresa,
      idTipoAsiento: h.idTipoAsiento,
      tipdoc: h.tipdoc,
      numdoc: h.numdoc,
      anio: h.anio,
      fechatransaccion: this.dateOnly(h.fechatransaccion)!,
      fechaingreso: this.dateOnly(h.fechaingreso)!,
      observacion: this.toNull(h.observacion, false),
      totdebe: Number(h.totdebe || 0),
      tothaber: Number(h.tothaber || 0),
      beneficiario: this.toNull(h.beneficiario, false),
      cierre: this.toNull(h.cierre, false),
      fechacierre: this.dateOnly(h.fechacierre),
      solicitado: this.toNull(h.solicitado, false),
      depto: this.toNull(h.depto, false),
      autorizado: this.toNull(h.autorizado, false),
      homCodigo: this.toNull(h.homCodigo),             // ✅ 0 -> null
      estado: !!h.estado,
      detalles,
    };
  }

  /** ===== Crear (POST baseUrl) ===== */
  crear(formValue: AsientoContableResponse): Observable<boolean> {
    const body: CreateAsientoRequest = this.mapToCreateRequest(formValue);
    return this.http.post<any>(`${this.baseUrl}`, body).pipe(
      map(resp => this.unwrapOk(resp)),
      catchError(err => { console.error('[crear] Error', err); return of(false); })
    );
  }

  /** ===== Actualizar (PUT Update/{id}) — enviamos el mismo shape que Create ===== */
  actualizar(idCabMaestro: number, formValue: AsientoContableResponse): Observable<boolean> {
    const body: CreateAsientoRequest = this.mapToCreateRequest(formValue);
    return this.http.put<any>(`${this.baseUrl}/Update/${idCabMaestro}`, body).pipe(
      map(resp => this.unwrapOk(resp)),
      catchError(err => {
        console.error('[AsientosContablesService.actualizar] Error:', err);
        return of(false);
      })
    );
  }

  eliminar(idCabMaestro: number): Observable<boolean> {
    return this.http.delete<any>(`${this.baseUrl}/Delete/${idCabMaestro}`).pipe(
      map(resp => this.unwrapOk(resp)),
      catchError(err => {
        console.error('[AsientosContablesService.eliminar] Error:', err);
        return of(false);
      })
    );
  }

  /** Normaliza respuestas tipo ApiResponse<T> */
  private unwrapOk(resp: any): boolean {
    if (typeof resp === 'boolean') return resp;
    if (resp?.ok !== undefined) return !!resp.ok;
    if (resp?.success !== undefined) return !!resp.success;
    if (resp?.succeeded !== undefined) return !!resp.succeeded;
    if (typeof resp?.data === 'boolean') return resp.data;
    return true;
  }
}
