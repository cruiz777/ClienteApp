/* =========================================================
 * facturacion-workflow.service.ts
 * Workflow: crear factura -> crear asiento VT -> actualizar nota -> generar XML
 * ========================================================= */

import { Injectable } from '@angular/core';
import { Observable, of, defer } from 'rxjs';
import { catchError, concatMap, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { FacturacionService, FacturaCrearRequest } from 'src/app/services/facturacion.service';
import { AsientoVentaService, AsientoVentaRequest } from 'src/app/services/asiento-venta.service';

/** Ajusta si tu ApiResponse real difiere */
export interface ApiResponse<T> {
  type?: string;
  code?: string;
  message?: string;
  data?: T;
  success?: boolean;
}

/** Respuesta típica de crear factura (según tu screenshot) */
export interface FacturaCrearResponseData {
  idNota?: number;
  id_nota?: number;

  // en tu screenshot viene así:
  numeroFactura?: string;         // "0019990000000090"
  numero_factura?: string;

  claveAcceso?: string;
  clave_acceso?: string;

  // otros campos no críticos
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
  numeroFactura: string;  // comprobante completo "001999..."
  secuencial: string;     // últimos 9 dígitos
  numdocVT: string;       // Numdoc del asiento (string numérica)

  claveAcceso?: string;

  // para log / auditoría
  mensajes: string[];

  // si falló
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FacturacionWorkflowService {
  /** Anti-duplicados: misma llave => misma ejecución compartida */
  private inFlight = new Map<string, Observable<WorkflowResult>>();

  constructor(
    private facturacionService: FacturacionService,
    private asientoVentaService: AsientoVentaService,
  ) {}

  /**
   * PROCESO COMPLETO
   * - payload: el mismo FacturaCrearRequest que usas en facturación individual
   * - buildAsiento: función que arma el AsientoVentaRequest con el idNota ya creado
   *
   * IMPORTANTE:
   *  - Si tu UI llama esto 2, 3 o 4 veces para el mismo cliente/prefijo/total,
   *    aquí se ejecuta 1 sola vez (shareReplay + inFlight).
   */
  procesarFacturaCompleta(
    payload: FacturaCrearRequest,
    buildAsiento: (idNota: number) => AsientoVentaRequest,
    options?: {
      /** clave anti-duplicado personalizada (si no, se arma con cliente/prefijo/total) */
      key?: string;
      /** si true: NO bloquea duplicados (por defecto bloquea) */
      allowDuplicates?: boolean;
      /** prefijo para asiento: "VT-" por defecto */
      asientoPrefix?: string;
    }
  ): Observable<WorkflowResult> {
    const asientoPrefix = options?.asientoPrefix ?? 'VT-';

    const key =
      options?.key ??
      this.buildKeyFromPayload(payload);

    if (!options?.allowDuplicates) {
      const existing = this.inFlight.get(key);
      if (existing) return existing;
    }

    const obs$ = defer(() => {
      const mensajes: string[] = [];

      // 1) CREAR FACTURA
      return this.facturacionService.crear(payload).pipe(
        map((resp: ApiResponse<FacturaCrearResponseData> | any) => {
          const data = resp?.data ?? resp?.Data ?? resp;
          const tipo = (resp?.type ?? resp?.Type ?? '').toString().toLowerCase();

          // No rompo si backend usa "success"/"warning"/"created"
          if (tipo && tipo !== 'success' && tipo !== 'warning' && tipo !== 'created') {
            const msg = resp?.message ?? 'No se pudo crear la factura.';
            throw new Error(msg);
          }

          const idNota = Number(data?.idNota ?? data?.id_nota ?? 0);
          const numeroFactura =
            (data?.numeroFactura ?? data?.numero_factura ?? '').toString().trim();
          const claveAcceso =
            (data?.claveAcceso ?? data?.clave_acceso ?? '').toString().trim();

          if (!Number.isFinite(idNota) || idNota <= 0) {
            throw new Error('No se recibió idNota válido en la respuesta de crear factura.');
          }

          if (!numeroFactura) {
            // si no viene, igual seguimos, pero luego fallará al armar secuencial si lo necesitas
            mensajes.push('Factura creada pero no se recibió numeroFactura.');
          } else {
            mensajes.push(`Factura creada: ${numeroFactura}`);
          }

          const secuencial = this.extractSecuencial(numeroFactura); // últimos 9 dígitos

          return { idNota, numeroFactura, secuencial, claveAcceso, mensajes };
        }),

        // 2) CREAR ASIENTO VT
        concatMap(({ idNota, numeroFactura, secuencial, claveAcceso, mensajes }) => {
          const asientoReq = buildAsiento(idNota);

          return this.asientoVentaService.crearAsientoVenta(asientoReq).pipe(
            map((asResp: any) => {
              const msg = (asResp?.message ?? asResp?.Message ?? '').toString();
              mensajes.push(msg || 'Asiento VT creado.');

              // Busca Numdoc=12345 dentro del mensaje
              const numdocVT = this.extractNumdocFromMessage(msg);

              if (!numdocVT) {
                // No abortamos todavía, pero para tu caso necesitas ese número para actualizar la nota
                throw new Error(
                  `Asiento creado pero no se pudo obtener Numdoc del mensaje. Mensaje: ${msg || '(vacío)'}`
                );
              }

              return { idNota, numeroFactura, secuencial, claveAcceso, numdocVT, mensajes };
            })
          );
        }),

        // 3) ACTUALIZAR NOTA CON ASIENTO: "VT-Numdoc"
        concatMap(({ idNota, numeroFactura, secuencial, claveAcceso, numdocVT, mensajes }) => {
          const asientoFormateado = `${asientoPrefix}${numdocVT}`;

          return this.facturacionService.actualizarAsientoContable(idNota, asientoFormateado).pipe(
            tap((r: any) => {
              const tipo = (r?.type ?? r?.Type ?? '').toString().toLowerCase();
              if (tipo && tipo !== 'success' && tipo !== 'warning' && tipo !== 'created') {
                mensajes.push(`⚠️ actualizarAsientoContable: ${(r?.message ?? 'falló').toString()}`);
              } else {
                mensajes.push(`Nota actualizada con asiento: ${asientoFormateado}`);
              }
            }),
            map(() => ({ idNota, numeroFactura, secuencial, claveAcceso, numdocVT, mensajes }))
          );
        }),

        // 4) GENERAR XML
        concatMap(({ idNota, numeroFactura, secuencial, claveAcceso, numdocVT, mensajes }) => {
          return this.facturacionService.generarXmlEnServidor(idNota).pipe(
            tap((xml: XmlResult | any) => {
              if (xml?.success) {
                mensajes.push(`XML generado: ${xml?.fileName ?? ''}`.trim());
              } else {
                mensajes.push(`⚠️ XML no generado: ${(xml?.message ?? 'sin detalle').toString()}`);
              }
            }),
            map((): WorkflowResult => ({
              ok: true,
              idNota,
              numeroFactura,
              secuencial,
              numdocVT,
              claveAcceso,
              mensajes,
            }))
          );
        }),

        catchError((err: any) => {
          const msg = err?.message ?? err?.error?.message ?? 'Error en workflow de facturación.';
          const fail: WorkflowResult = {
            ok: false,
            idNota: 0,
            numeroFactura: '',
            secuencial: '',
            numdocVT: '',
            mensajes: [],
            error: msg,
          };
          return of(fail);
        }),

        finalize(() => {
          // libera la llave para que pueda ejecutarse nuevamente si el usuario lo intenta otra vez
          if (!options?.allowDuplicates) this.inFlight.delete(key);
        })
      );
    }).pipe(
      // comparte ejecución ante múltiples subscribers (ej: UI + export + log)
      shareReplay({ bufferSize: 1, refCount: false })
    );

    if (!options?.allowDuplicates) this.inFlight.set(key, obs$);
    return obs$;
  }

  /* =========================================================
   * Helpers
   * ========================================================= */

  private buildKeyFromPayload(p: FacturaCrearRequest): string {
    const idCliente = Number((p as any)?.idCliente ?? 0);
    const prefijo = ((p as any)?.prefijo ?? '').toString().trim();
    const total = Number((p as any)?.totalCalculado ?? (p as any)?.total ?? 0);
    const anio = Number((p as any)?.anioFactura ?? 0);

    // si en global repites exactamente lo mismo, esto lo considera el mismo “job”
    return `cli=${idCliente}|pref=${prefijo}|tot=${total.toFixed(2)}|anio=${anio}`;
  }

  /** Extrae últimos 9 dígitos del comprobante */
  private extractSecuencial(numeroFactura: string): string {
    const s = (numeroFactura ?? '').toString().replace(/\D/g, '');
    if (!s) return '';
    return s.slice(-9).padStart(9, '0');
  }

  /** Extrae Numdoc=12345 desde el mensaje del backend */
  private extractNumdocFromMessage(msg: string): string {
    const m = (msg ?? '').match(/Numdoc\s*=\s*(\d+)/i);
    return m?.[1] ? m[1].toString() : '';
  }
  // ✅ Alias compatible con tu componente (mantiene el nombre que ya estás usando)
procesarFacturaConAsientoObligatorio(
  payload: FacturaCrearRequest,
  buildAsiento: (idNota: number) => AsientoVentaRequest,
  options?: {
    key?: string;
    allowDuplicates?: boolean;
    asientoPrefix?: string;
  }
): Observable<WorkflowResult> {
  return this.procesarFacturaCompleta(payload, buildAsiento, options);
}

}
