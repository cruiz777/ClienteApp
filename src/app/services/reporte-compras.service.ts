import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PurchaseReportRequest } from '../interfaces/requests/reporte-compras-request';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PurchaseReportResponse } from '../interfaces/responses/reporte-compras-response';

@Injectable({
  providedIn: 'root'
})
export class PurchaseReportService {
  private apiUrl = `${environment.anexoTransaccionalUrl}/ReporteCompras`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el reporte de compras en formato JSON para previsualización en AG-Grid
   * @param request Parámetros del reporte (fechas, empresa)
   * @returns Observable con el reporte completo
   */
  getReport(request: PurchaseReportRequest): Observable<ApiResponse<PurchaseReportResponse>> {
    // Asegurar que las fechas estén en formato ISO para el backend
    const formattedRequest = {
      ...request,
      fechaInicio: this.formatDate(request.fechaInicio),
      fechaFin: this.formatDate(request.fechaFin),
      formato: 'json'
    };

    return this.http.post<ApiResponse<PurchaseReportResponse>>(
      `${this.apiUrl}/report`,
      formattedRequest
    );
  }

  /**
   * Descarga el reporte de compras en formato Excel
   * @param request Parámetros del reporte (fechas, empresa)
   * @returns Observable con el archivo Blob
   */
  downloadExcel(request: PurchaseReportRequest): Observable<Blob> {
    const formattedRequest = {
      ...request,
      fechaInicio: this.formatDate(request.fechaInicio),
      fechaFin: this.formatDate(request.fechaFin),
      formato: 'excel'
    };

    return this.http.post(
      `${this.apiUrl}/export-excel`,
      formattedRequest,
      { 
        responseType: 'blob',
        observe: 'response'
      }
    ).pipe(
      map(response => response.body as Blob)
    );
  }

  /**
   * Descarga el Excel y lo guarda automáticamente
   * @param request Parámetros del reporte
   * @param customFileName Nombre personalizado del archivo (opcional)
   */
  downloadAndSaveExcel(request: PurchaseReportRequest, customFileName?: string): void {
    this.downloadExcel(request).subscribe({
      next: (blob) => {
        const fileName = customFileName || 
          `ReporteCompras_${this.formatDateForFilename(request.fechaInicio)}_${this.formatDateForFilename(request.fechaFin)}.xlsx`;
        
        this.saveFile(blob, fileName);
      },
      error: (error) => {
        console.error('Error al descargar el Excel:', error);
        throw error;
      }
    });
  }

  /**
   * Guarda un blob como archivo en el navegador
   */
  private saveFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formatea una fecha para el backend (ISO 8601)
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  }

  /**
   * Formatea una fecha para nombre de archivo (YYYYMMDD)
   */
  private formatDateForFilename(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}