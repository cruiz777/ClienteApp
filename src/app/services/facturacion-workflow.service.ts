/* =========================================================
 * facturacion-workflow.service.ts  (CORREGIDO)
 * ========================================================= */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, defer, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  finalize,
  map,
  shareReplay,
  tap,
} from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import {
  FacturacionService,
  FacturaCrearRequest,
} from 'src/app/services/facturacion.service';
import {
  AsientoVentaService,
  AsientoVentaRequest,
} from 'src/app/services/asiento-venta.service';

export interface ApiResponse<T> {
  type?: string;
  code?: string;
  message?: string;
  data?: T;
  success?: boolean;
  [k: string]: any;
}

export interface FacturaCrearResponseData {
  idNota?: number;
  id_nota?: number;
  numeroFactura?: string;
  numero_factura?: string;
  claveAcceso?: string;
  clave_acceso?: string;
  [k: string]: any;
}

export interface XmlResult {
  success?: boolean;
  fileName?: string;
  message?: string;
  [k: string]: any;
}

export interface WorkflowResult {
  ok: boolean;
  idNota: number;
  numeroFactura: string;
  secuencial: string;
  numdocVT: string;
  claveAcceso?: string;
  mensajes: string[];
  xmlFileName?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FacturacionWorkflowService {
  private inFlight = new Map<string, Observable<WorkflowResult>>();

  // ✅ MISMO endpoint que usas (NO lo cambiamos)
  private readonly asientoUrl = `${environment.transactionUrl}/AsientosContables`;

  constructor(
    private http: HttpClient,
    private facturacionService: FacturacionService,
    private asientoVentaService: AsientoVentaService
  ) {}

  /* =========================================================
   * WORKFLOW COMPLETO:
   * 1) crear factura
   * 2) crear asiento
   * 3) actualizar NOTA con VT-Numdoc
   * 4) generar XML
   * ========================================================= */
  procesarFacturaCompleta(
    payload: FacturaCrearRequest,
    buildAsiento: (idNota: number, numeroFactura?: string) => AsientoVentaRequest,
    options?: { key?: string; allowDuplicates?: boolean; asientoPrefix?: string }
  ): Observable<WorkflowResult> {
    const key = options?.key ?? this.buildKeyFromPayload(payload);

    if (this.inFlight.has(key)) return this.inFlight.get(key)!;

    const obs$ = defer(() => {
      // =========================================================
      // 1) CREAR FACTURA
      // =========================================================
      return this.facturacionService.crear(payload).pipe(
        concatMap((resp: any) => {
          const data: any = resp?.data ?? resp ?? {};
          const idNota = Number(data.idNota ?? data.id_nota ?? 0) || 0;

          const numeroFactura = (data.numeroFactura ?? data.numero_factura ?? '')
            .toString()
            .trim();

          const claveAcceso = (data.claveAcceso ?? data.clave_acceso ?? '')
            .toString()
            .trim();

          if (!idNota || !numeroFactura) {
            return throwError(() => ({
              status: 500,
              error: {
                message:
                  'No se obtuvo idNota o numeroFactura desde el backend.',
              },
            }));
          }

          const reqAsiento = buildAsiento(idNota, numeroFactura);

          // =========================================================
          // 2) CREAR ASIENTO
          // =========================================================
          return this.crearAsientoConCompatibilidad(reqAsiento).pipe(
            concatMap((asResp: any) => {
              const msg = (
                asResp?.message ??
                asResp?.data?.message ??
                ''
              ).toString();

              const numdoc = this.extractNumdocFromMessage(msg) || '';
              const asientoPrefix = (options?.asientoPrefix ?? 'VT').toString();
              const numdocVT = numdoc ? `${asientoPrefix}-${numdoc}` : '';

              if (!numdocVT) {
                // Si NO hay Numdoc, no puedes actualizar nota ni generar xml confiable.
                return throwError(() => ({
                  status: 500,
                  error: {
                    message:
                      'El backend no devolvió Numdoc del asiento. No se puede actualizar la nota.',
                  },
                }));
              }

              // =========================================================
              // 3) ACTUALIZAR NOTA CON VT-Numdoc
              //    (reusa tu service existente)
              // =========================================================
              return this.actualizarNotaConAsiento(idNota, numdocVT).pipe(
                concatMap((okUpd) => {
                  if (!okUpd) {
                    return throwError(() => ({
                      status: 500,
                      error: {
                        message:
                          `No se pudo actualizar la NOTA (${idNota}) con el asiento ${numdocVT}.`,
                      },
                    }));
                  }

                  // =========================================================
                  // 4) GENERAR XML
                  // =========================================================
                  return this.generarXmlPorNota(idNota).pipe(
                    map((xml: any) => {
                      const xmlFileName =
                        (xml?.fileName ??
                          xml?.data?.fileName ??
                          xml?.xmlFileName ??
                          xml?.data?.xmlFileName ??
                          '').toString() || undefined;

                      const mensajes: string[] = [];
                      if (msg) mensajes.push(msg);
                      mensajes.push(`NOTA actualizada con asiento: ${numdocVT}`);
                      if (xml?.message) mensajes.push(xml.message);

                      return {
                        ok: true,
                        idNota,
                        numeroFactura,
                        secuencial: this.extractSecuencial(numeroFactura),
                        numdocVT,
                        claveAcceso: claveAcceso || undefined,
                        mensajes,
                        xmlFileName,
                      } as WorkflowResult;
                    })
                  );
                })
              );
            })
          );
        }),
        catchError((err) => {
          const m =
            err?.error?.message ??
            err?.message ??
            'Error en workflow.';
          return of({
            ok: false,
            idNota: 0,
            numeroFactura: '',
            secuencial: '',
            numdocVT: '',
            mensajes: [],
            error: m,
          } as WorkflowResult);
        })
      );
    }).pipe(finalize(() => this.inFlight.delete(key)), shareReplay(1));

    this.inFlight.set(key, obs$);
    return obs$;
  }

  // ✅ Alias (si tu componente llama esto)
  procesarFacturaConAsientoObligatorio(
    payload: FacturaCrearRequest,
    buildAsiento: (idNota: number, numeroFactura?: string) => AsientoVentaRequest,
    options?: { key?: string; allowDuplicates?: boolean; asientoPrefix?: string }
  ): Observable<WorkflowResult> {
    return this.procesarFacturaCompleta(payload, buildAsiento, options);
  }

  /* =========================================================
   * PASO 3: actualizar NOTA con asiento (VT-Numdoc)
   * ========================================================= */
  private actualizarNotaConAsiento(
    idNota: number,
    numdocVT: string
  ): Observable<boolean> {
    return this.facturacionService.actualizarAsientoContable(idNota, numdocVT).pipe(
      map((resp: any) => {
        const tipo = (resp?.type ?? '').toString().toLowerCase();
        // en tu sistema: success / warning suelen considerarse OK
        return tipo === 'success' || tipo === 'warning' || resp?.success === true;
      }),
      catchError((err: any) => {
        console.error('[workflow] error actualizarNotaConAsiento:', err);
        return of(false);
      })
    );
  }

  /* =========================================================
   * PASO 4: generar XML
   *  - Ajusta SOLO si tu FacturacionService usa otro nombre de método.
   * ========================================================= */
  private generarXmlPorNota(idNota: number): Observable<XmlResult> {
    // ✅ OPCIÓN A: si existe este método en tu service
    const s: any = this.facturacionService as any;

    if (typeof s.generarXmlEnServidor === 'function') {
      return s.generarXmlEnServidor(idNota) as Observable<XmlResult>;
    }

    if (typeof s.generarXmlPorNota === 'function') {
      return s.generarXmlPorNota(idNota) as Observable<XmlResult>;
    }

    if (typeof s.generarXml === 'function') {
      return s.generarXml(idNota) as Observable<XmlResult>;
    }

    // ✅ OPCIÓN B: fallback por Http directo (si tu backend expone endpoint)
    // Si NO quieres fallback, puedes eliminar este bloque.
    // AJUSTA la ruta si tu endpoint es distinto.
    const url = `${environment.invoices_sic}/facturacion/xml/${idNota}`;
    return this.http.post<XmlResult>(url, {}).pipe(
      catchError((err: any) => {
        console.error('[workflow] error generarXmlPorNota:', err);
        return of({ success: false, message: 'No se pudo generar XML.' });
      })
    );
  }

  /* =========================================================
   * COMPAT: intenta normal, si backend exige { request: ... } reintenta
   * ========================================================= */
  private crearAsientoConCompatibilidad(req: AsientoVentaRequest): Observable<any> {
    const normalized = this.normalizeAsientoForApi(req);

    return this.asientoVentaService.crearAsientoVenta(normalized as any).pipe(
      catchError((err: any) => {
        const requiereWrapper =
          err?.status === 400 &&
          (err?.error?.errors?.request || err?.error?.errors?.Request);

        if (!requiereWrapper) return throwError(() => err);

        return this.http.post<any>(this.asientoUrl, { request: normalized });
      })
    );
  }

  private normalizeAsientoForApi(req: any): any {
    return {
      ...req,
      Anio: req.Anio ?? req.anio ?? '',
      Tipdoc: req.Tipdoc ?? req.tipdoc ?? '',
      Detalles: req.Detalles ?? req.detalles ?? [],
    };
  }

  /* =========================================================
   * helpers
   * ========================================================= */
  private buildKeyFromPayload(p: FacturaCrearRequest): string {
    const idCliente = Number((p as any)?.idCliente ?? 0);
    const prefijo = ((p as any)?.prefijo ?? '').toString().trim();
    const total = Number((p as any)?.totalCalculado ?? (p as any)?.total ?? 0);
    const anio = Number((p as any)?.anioFactura ?? 0);
    return `cli=${idCliente}|pref=${prefijo}|tot=${total.toFixed(2)}|anio=${anio}`;
  }

  private extractSecuencial(numeroFactura: string): string {
    const s = (numeroFactura ?? '').toString().replace(/\D/g, '');
    return s ? s.slice(-9).padStart(9, '0') : '';
  }

  private extractNumdocFromMessage(msg: string): string {
    const m = (msg ?? '').match(/Numdoc\s*=\s*(\d+)/i);
    return m?.[1] ? m[1].toString() : '';
  }
}
