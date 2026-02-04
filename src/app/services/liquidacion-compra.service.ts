// liquidacion-compra.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse  } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AsientoImpresion } from 'src/app/interfaces/responses/asiento-impresion.model';
import { ApiResponse, LiquidacionCompraRequest } from 'src/app/interfaces/requests/liquidacion-compra-request';
import { LiquidacionCompraResponse } from 'src/app/interfaces/responses/liquidacion-compra-response';

export interface GenerarXmlLiquidacionResult {
  success: boolean;
  message: string;
  fileName?: string;
  savedPath?: string;
  claveAcceso?: string;
  secuencial?: string;
  establecimiento?: string;
  puntoEmision?: string;
  totalDetalles?: number;
  rucEmpresa?: string;
}

export interface DescargarPdfResult {
  blob: Blob;
  fileName: string;
}

@Injectable({ providedIn: 'root' })
export class LiquidacionCompraService {
  /**
   * Ajusta esta ruta a tu API real:
   * - Si tu controlador es [Route("api/[Controller]")] y se llama LiquidacionCompraController
   *   normalmente queda: /api/LiquidacionCompra
   * - En tu environment.transactionUrl normalmente ya incluye /api
   */



  private readonly baseUrl = `${environment.transactionUrl}/LiquidacionCompra`;

  constructor(private http: HttpClient) {}
 
  /** ===================== GET BY ID ===================== */
  getById(idCabMaestro: number): Observable<LiquidacionCompraResponse> {
    return this.http
      .get<ApiResponse<LiquidacionCompraResponse>>(`${this.baseUrl}/${idCabMaestro}`)
      .pipe(map(r => (r as any)?.data ?? (r as any)?.Data ?? (r as any)));
  }

  /** ===================== CREATE ===================== */
  crear(formValue: LiquidacionCompraResponse): Observable<ApiResponse<number>> {
    const body: LiquidacionCompraRequest = this.mapToCreateRequest(formValue);
    return this.http.post<ApiResponse<number>>(this.baseUrl, body);
  }

  /** ===================== UPDATE ===================== */
  actualizar(idCabMaestro: number, formValue: LiquidacionCompraResponse): Observable<ApiResponse<boolean>> {
    const body: LiquidacionCompraRequest = this.mapToCreateRequest(formValue);
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${idCabMaestro}`, body);
  }

  getAsientoImpresion(idCabMaestro: number): Observable<AsientoImpresion> {
      const urlImpresion =
        `${environment.transactionUrl}/AsientosContables/${idCabMaestro}/impresion`;
  
      return this.http.get<any>(urlImpresion).pipe(
        map(raw => {
          const data =
            raw?.data ??
            raw?.Data ??
            raw?.result ??
            raw?.Result ??
            raw;
          return data as AsientoImpresion;
        })
      );
    }

  /** ===================== LISTADO (si tu API lo tiene) ===================== */
  GetListado(fechaInicio: string, fechaFinal: string): Observable<any[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFinal', fechaFinal);

    return this.http.get<any>(`${this.baseUrl}/listado`, { params }).pipe(
      map(raw => {
        const items: any[] =
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.data) ? raw.data :
          Array.isArray(raw?.Data) ? raw.Data :
          Array.isArray(raw?.items) ? raw.items :
          [];
        return items;
      }),
      catchError(err => {
        console.error('GetListado error', err);
        return of([]);
      })
    );
  }

  //xml

   generarXml(idCabLiquidacion: number, copiarADiscoR: boolean = true): Observable<GenerarXmlLiquidacionResult> {
    // Si siempre es true, puedes dejar fijo el parámetro desde aquí o desde el componente.
    const params = new HttpParams().set('copiarADiscoR', String(copiarADiscoR));

    return this.http
      .post<any>(`${this.baseUrl}/generar-xml/${idCabLiquidacion}`, null, { params })
      .pipe(
        map(raw => this.unwrapAny(raw)),
        map(d => this.mapGenerarXmlResult(d)),
        catchError(err => {
          console.error('generarXml error', err);
          throw err;
        })
      );
  }

  /*
  descargarPdf(idCabLiquidacion: number): Observable<DescargarPdfResult> {
      return this.http
        .get(`${this.baseUrl}/${idCabLiquidacion}/pdf`, {
          observe: 'response',
          responseType: 'blob'
        })
        .pipe(
          map((resp: HttpResponse<Blob>) => {
            const fileName =
              this.getFileNameFromContentDisposition(resp.headers.get('content-disposition')) ??
              `LIQ-${idCabLiquidacion}.pdf`;

            const blob = resp.body ?? new Blob([], { type: 'application/pdf' });

            return { blob, fileName } as DescargarPdfResult;
          }),
          catchError(err => {
            console.error('descargarPdf error', err);
            throw err;
          })
        );
  }
  */

  descargarPdf(idCabLiquidacion: number): Observable<DescargarPdfResult> {
    return this.http
      .get(`${this.baseUrl}/${idCabLiquidacion}/pdf`, {
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        map((resp: HttpResponse<Blob>) => {
          const cd = resp.headers.get('content-disposition');
          const nameFromHeader = this.getFileNameFromContentDisposition(cd);

          const fileName = (nameFromHeader && nameFromHeader.trim())
            ? nameFromHeader.trim()
            : `LIQ-${idCabLiquidacion}.pdf`;

          const blob = resp.body ?? new Blob([], { type: 'application/pdf' });

          return { blob, fileName };
        }),
        catchError((err) => {
          const backendMsg =
            err?.error?.message ||
            err?.error?.Message ||
            err?.message ||
            'Error al descargar PDF de liquidación.';
          return throwError(() => new Error(backendMsg));
        })
      );
  }

  /** =========================================================
   *   MAPEO UI -> PAYLOAD API (NULLS + FORMATOS FECHA)
   * ========================================================= */
  private mapToCreateRequest(h: LiquidacionCompraResponse): LiquidacionCompraRequest {
    const detallesAsiento = (h.detalles ?? []).map(d => ({
      IdDetMaestro: Number(d.IdDetMaestro ?? 0),
      IdCabMaestro: Number(d.IdCabMaestro ?? 0),

      numlinea: Number(d.numlinea ?? 0),
      anio: d.anio ?? '',

      fechatransaccion: this.dateOnly(d.fechatransaccion),
      fechaingreso: this.dateTimeIso(d.fechaingreso),
      hora: this.toNull(d.hora, false),

      idZona: Number(d.idZona ?? 0),
      idCentroCostos: this.toNull(d.idCentroCostos),
      idLocal: this.toNull(d.idLocal),

      idPlanCuentas: this.toNull(d.idPlanCuentas),
      codprePc: this.toNull(d.codprePc, true),

      idCodContable: this.toNull(d.idCodContable),
      nocomprobante: this.toNull(d.nocomprobante, true),
      docurelacionado: this.toNull(d.docurelacionado, true),

      cheque: this.toNull(d.cheque),
      beneficiario: this.toNull(d.beneficiario, true),

      debe: Number(d.debe ?? 0),
      haber: Number(d.haber ?? 0),

      comentario: this.toNull(d.comentario, true),

      idMovBancario: this.toNull(d.idMovBancario),
      movbancario: this.toNull(d.movbancario, true),

      cierre: this.toNull(d.cierre, true),
      fechacierre: this.dateOnly(d.fechacierre),

      conciliado: this.toNull(d.conciliado, true),
      fechaconciliado: this.dateOnly(d.fechaconciliado),

      idSustentoTrib: this.toNull(d.idSustentoTrib),
      idTipoCompSri: this.toNull(d.idTipoCompSri),
      autorizacion: this.toNull(d.autorizacion, true),
      fechacaduca: this.dateOnly(d.fechacaduca),

      idTipoRetencion: this.toNull(d.idTipoRetencion),
      idProyecto: this.toNull(d.idProyecto),
      idSubproyecto: this.toNull(d.idSubproyecto),

      transferido: !!d.transferido,
      fechatransferido: this.dateOnly(d.fechatransferido),

      fechavencimiento: this.dateOnly(d.fechavencimiento),

      idConciliacion: this.toNull(d.idConciliacion),
      valorLetras: this.toNull(d.valorLetras, true),

      estadoIngreso: !!d.estadoIngreso,

      autorizacionRelacionado: this.toNull(d.autorizacionRelacionado, true),
      fechaCadRelacionado: this.dateOnly(d.fechaCadRelacionado),

      idPorIva: this.toNull(d.idPorIva),
      porcentaje: this.toNull(d.porcentaje),
    }));

    const liqCab = h.liquidacion?.cabecera ?? ({} as any);
    const liqDet = (h.liquidacion?.detalles ?? []).map(x => ({
      codpro: this.toNull(x.codpro, true),
      descripcion: this.toNull(x.descripcion, true),
      cantidad: Number(x.cantidad ?? 0),
      pvpunit: Number(x.pvpunit ?? 0),
      iva: Number(x.iva ?? 0),
      total: Number(x.total ?? 0),
      bien: Number(x.bien ?? 0),
      servicio: Number(x.servicio ?? 0),
      linea: Number(x.linea ?? 0),
      idPlanCuentas: this.toNull(x.idPlanCuentas),
      ctaContable: this.toNull(x.ctaContable, true),
      caja: this.toNull(x.caja, true),
      idPorIva: this.idOrNull(x.idPorIva),
      porcentaje: x.porcentaje == null ? null : this.num(x.porcentaje),
    }));

    const liqFP = (h.liquidacion?.formasPago ?? []).map(fp => ({
      idFormaPagoSri: this.toNull(fp.idFormaPagoSri),
      codigofpago: this.toNull(fp.codigofpago, true),
      valor: Number(fp.valor ?? 0),
      plazo: Number(fp.plazo),
    }));

    return {
      IdCabMaestro: Number(h.IdCabMaestro ?? 0),
      idZona: Number(h.idZona ?? 0),
      idUsuario: Number(h.idUsuario ?? 0),
      idEmpresa: Number(h.idEmpresa ?? 0),
      idTipoAsiento: Number(h.idTipoAsiento ?? 0),

      tipdoc: h.tipdoc ?? '',
      numdoc: Number(h.numdoc ?? 0),
      anio: h.anio ?? '',

      fechatransaccion: this.dateOnly(h.fechatransaccion) ?? this.dateOnly(new Date().toISOString())!,
      fechaingreso: this.dateTimeIso(h.fechaingreso) ?? this.dateTimeIso(new Date())!,

      observacion: this.toNull(h.observacion, true),
      totdebe: Number(h.totdebe ?? 0),
      tothaber: Number(h.tothaber ?? 0),

      beneficiario: this.toNull(h.beneficiario, true),

      cierre: this.toNull(h.cierre, true),
      fechacierre: this.dateOnly(h.fechacierre),

      solicitado: this.toNull(h.solicitado, true),
      depto: this.toNull(h.depto, true),
      autorizado: this.toNull(h.autorizado, true),

      homCodigo: this.toNull(h.homCodigo),
      estado: !!h.estado,

      modulo: (h.modulo != null && !isNaN(Number(h.modulo))) ? Number(h.modulo) : 6,

      detalles: detallesAsiento,

      liquidacion: {
        cabecera: {
          numliquida: this.toNull(liqCab.numliquida, true),
          caja: this.toNull(liqCab.caja, true),
          idCodContable: this.toNull(liqCab.idCodContable),
          ruc: this.toNull(liqCab.ruc, true),

          fecha: this.dateTimeIso(liqCab.fecha),
          fechaing: this.dateTimeIso(liqCab.fechaing),

          observacion: this.toNull(liqCab.observacion, true),

          subtotal: Number(liqCab.subtotal ?? 0),
          coniva: Number(liqCab.coniva ?? 0),
          siniva: Number(liqCab.siniva ?? 0),
          iva: Number(liqCab.iva ?? 0),
          total: Number(liqCab.total ?? 0),

          autorizacion: this.toNull(liqCab.autorizacion, true),
          fechacad: this.dateTimeIso(liqCab.fechacad),

          idTipoCompSri: this.toNull(liqCab.idTipoCompSri),
          tipdoc: this.toNull(liqCab.tipdoc, true),
          numdoc: this.toNull(liqCab.numdoc, true),
        },
        detalles: liqDet,
        formasPago: liqFP,
      },
    };
  }

  /** ===================== HELPERS ===================== */
  private dateOnly(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).substring(0, 10);
    return d.toISOString().substring(0, 10);
  }

  private dateTimeIso(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'string' && value.includes('T')) {
      return value.replace('Z', '');
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  private toNull<T>(v: T | null | undefined, emptyAsNull = true): T | null {
    if (v === undefined || v === null) return null;
    if (emptyAsNull && (v as any) === '') return null;
    if (emptyAsNull && typeof v === 'number' && Number(v) === 0) return null;
    return v as any;
  }

  //cambios
   private num(v: any): number {
    const n = Number(v ?? 0);
    return isNaN(n) ? 0 : n;
  }

  /** Para IDs: si viene 0, vacío, NaN => null */
  private idOrNull(v: any): number | null {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    if (isNaN(n) || n <= 0) return null;
    return n;
  }

  //xml

   private unwrapAny(raw: any): any {
    // Tu backend en generar-xml devuelve directo (success, message, etc.)
    // pero por seguridad soportamos wrappers típicos:
    return raw?.data ?? raw?.Data ?? raw?.result ?? raw?.Result ?? raw;
  }

  private mapGenerarXmlResult(d: any): GenerarXmlLiquidacionResult {
    return {
      success: !!(d?.success ?? d?.Success),
      message: String(d?.message ?? d?.Message ?? ''),
      fileName: d?.fileName ?? d?.FileName ?? null,
      savedPath: d?.savedPath ?? d?.SavedPath ?? null,
      claveAcceso: d?.claveAcceso ?? d?.ClaveAcceso ?? null,
      secuencial: d?.secuencial ?? d?.Secuencial ?? null,
      establecimiento: d?.establecimiento ?? d?.Establecimiento ?? null,
      puntoEmision: d?.puntoEmision ?? d?.PuntoEmision ?? null,
      totalDetalles: d?.totalDetalles ?? d?.TotalDetalles ?? null,
      rucEmpresa: d?.rucEmpresa ?? d?.RucEmpresa ?? null,
    };
  }

  /*
  private getFileNameFromContentDisposition(cd: string | null): string | null {
    if (!cd) return null;

    // Ej: content-disposition: attachment; filename=LIQ-xxx.pdf; filename*=UTF-8''LIQ-xxx.pdf
    const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cd);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1].replace(/"/g, '').trim());
    }

    const normalMatch = /filename\s*=\s*("?)([^";]+)\1/i.exec(cd);
    if (normalMatch?.[2]) {
      return normalMatch[2].trim();
    }

    return null;
  }
  */

   private getFileNameFromContentDisposition(cd: string | null): string | null {
    if (!cd) return null;

    // filename*=UTF-8''LIQ-....pdf
    const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cd);
    if (utf8?.[1]) {
      try {
        return decodeURIComponent(utf8[1].replace(/"/g, '').trim());
      } catch {
        return utf8[1].replace(/"/g, '').trim();
      }
    }

    // filename="LIQ-....pdf"  o filename=LIQ-....pdf
    const normal = /filename\s*=\s*("?)([^";]+)\1/i.exec(cd);
    if (normal?.[2]) return normal[2].trim();

    return null;
  }


}

