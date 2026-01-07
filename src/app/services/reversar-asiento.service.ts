// src/app/services/reversar-asiento.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

export interface GenerarReversoDesdeNotaRequest {
  idNota: number;
  idUsuario: number;
}

export interface GenerarReversoDesdePagoRequest {
  idPago: number;
  idUsuario: number;
}
// 🔹 NUEVO: request para Nota de Crédito
export interface GenerarReversoDesdeNotaCreditoRequest {
  idNota: number;
  idUsuario: number;
  numeroNotaCredito: string;
  numeroFactura: string;
}


export interface GenerarAsientoReversoResponse {
  idCabMaestroOriginal: number;
  idCabMaestroReverso: number;
  numdocOriginal: string;
  numdocReverso: string;
}

// Si quieres distinguirlo explícitamente del de Nota, lo dejamos como tipo separado
export interface GenerarAsientoReversoPagoResponse {
  idCabMaestroOriginal: number;
  idCabMaestroReverso: number;
  numdocOriginal: string; // ej. "IG-25120026"
  numdocReverso: string;  // ej. "IG-25120027"
}

export interface ApiResponse<T> {
  id: string;
  type: string;           // "success" | "error"
  data: T | null;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReversarAsientoService {

  // Base de la API de facturación
  private readonly baseUrl = environment.invoices_sic + '/Notas';

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Genera un asiento de reverso a partir de una nota (sic.nota)
   * POST /api/Notas/generar-reverso-asiento
   */
  generarReversoDesdeNota(
    idNota: number,
    idUsuario: number
  ): Observable<ApiResponse<GenerarAsientoReversoResponse>> {

    const body: GenerarReversoDesdeNotaRequest = {
      idNota,
      idUsuario
    };

    return this.http.post<ApiResponse<GenerarAsientoReversoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento`,
      body
    );
  }

  /**
   * Variante por si algún día quieres enviar el DTO ya armado (nota).
   */
  generarReversoDesdeNotaDto(
    request: GenerarReversoDesdeNotaRequest
  ): Observable<ApiResponse<GenerarAsientoReversoResponse>> {
    return this.http.post<ApiResponse<GenerarAsientoReversoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento`,
      request
    );
  }

  /**
   * Genera un asiento de reverso a partir de un pago (sic.pagos)
   * POST /api/Notas/generar-reverso-asiento-pago
   */
  generarReversoDesdePago(
    idPago: number,
    idUsuario: number
  ): Observable<ApiResponse<GenerarAsientoReversoPagoResponse>> {

    const body: GenerarReversoDesdePagoRequest = {
      idPago,
      idUsuario
    };

    return this.http.post<ApiResponse<GenerarAsientoReversoPagoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento-pago`,
      body
    );
  }

  /**
   * Variante por DTO ya armado (pago).
   */
  generarReversoDesdePagoDto(
    request: GenerarReversoDesdePagoRequest
  ): Observable<ApiResponse<GenerarAsientoReversoPagoResponse>> {
    return this.http.post<ApiResponse<GenerarAsientoReversoPagoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento-pago`,
      request
    );
  }
  /**
   * Genera un asiento de reverso a partir de una Nota de Crédito
   * POST /api/Notas/generar-reverso-asiento-nota-credito
   */
  generarReversoDesdeNotaCredito(
    idNota: number,
    idUsuario: number,
    numeroNotaCredito: string,
    numeroFactura: string
  ): Observable<ApiResponse<GenerarAsientoReversoResponse>> {

    const body: GenerarReversoDesdeNotaCreditoRequest = {
      idNota,
      idUsuario,
      numeroNotaCredito,
      numeroFactura
    };

    return this.http.post<ApiResponse<GenerarAsientoReversoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento-nota-credito`,
      body
    );
  }

  /**
   * Variante enviando el DTO ya armado (nota de crédito).
   */
  generarReversoDesdeNotaCreditoDto(
    request: GenerarReversoDesdeNotaCreditoRequest
  ): Observable<ApiResponse<GenerarAsientoReversoResponse>> {

    return this.http.post<ApiResponse<GenerarAsientoReversoResponse>>(
      `${this.baseUrl}/generar-reverso-asiento-nota-credito`,
      request
    );
  }


}
