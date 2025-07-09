import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductoUnidadLogisticaCompleteResponse, ProductoUnidadLogisticaResponse, ReporteUnidadLogisticaParams } from '../interfaces/responses/producto-reporte-response';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';


@Injectable({
  providedIn: 'root'
})
export class ReporteUnidadLogisticaService {
  private readonly baseUrl = `${environment.reportUrl}/Producto`; // Ajusta según tu configuración

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el reporte de unidad logística con filtros opcionales
   * @param params Parámetros de filtro para el reporte
   * @returns Observable con la respuesta del API
   */
  getReporteUnidadLogistica(params: ReporteUnidadLogisticaParams = {}): Observable<ApiListResponse<ProductoUnidadLogisticaCompleteResponse>> {
    let httpParams = new HttpParams();

    // Agregar parámetros solo si tienen valor
    if (params.prefijo) {
      httpParams = httpParams.set('prefijo', params.prefijo);
    }
    
    if (params.clienteCodigo !== undefined && params.clienteCodigo !== null) {
      httpParams = httpParams.set('clienteCodigo', params.clienteCodigo.toString());
    }
    
    if (params.codigoProducto) {
      httpParams = httpParams.set('codigoProducto', params.codigoProducto);
    }
    
    if (params.fechaDesde) {
      httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    }
    
    if (params.fechaHasta) {
      httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    }
    
    if (params.condicionFecha) {
      httpParams = httpParams.set('condicionFecha', params.condicionFecha);
    }
    
    if (params.estado !== undefined && params.estado !== null) {
      httpParams = httpParams.set('estado', params.estado.toString());
    }
    
    if (params.pageNumber !== undefined && params.pageNumber !== null) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    } else {
      httpParams = httpParams.set('pageNumber', '1');
    }
    
    if (params.pageSize !== undefined && params.pageSize !== null) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    } else {
      httpParams = httpParams.set('pageSize', '50');
    }

    return this.http.get<ApiListResponse<ProductoUnidadLogisticaCompleteResponse>>(
      `${this.baseUrl}/unidad-logistica`,
      { params: httpParams }
    );
  }

  /**
   * Obtiene todas las páginas del reporte (útil para exportaciones)
   * @param params Parámetros de filtro
   * @returns Observable con todos los productos
   */
  getAllProductos(params: ReporteUnidadLogisticaParams = {}): Observable<ProductoUnidadLogisticaResponse[]> {
    return new Observable(observer => {
      const productos: ProductoUnidadLogisticaResponse[] = [];
      let currentPage = 1;
      const pageSize = 1000; // Tamaño máximo permitido

      const fetchPage = () => {
        const pageParams = { ...params, pageNumber: currentPage, pageSize };
        
        this.getReporteUnidadLogistica(pageParams).subscribe({
          next: (response) => {
            if (response.type === 'SUCCESS' && response.data) {
              productos.push(...response.data.productos.items);
              
              // Si hay más páginas, continuar
              if (currentPage < response.data.productos.totalPages) {
                currentPage++;
                fetchPage();
              } else {
                // Todos los productos obtenidos
                observer.next(productos);
                observer.complete();
              }
            } else {
              observer.error(new Error(response.message || 'Error al obtener productos'));
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      fetchPage();
    });
  }

  /**
   * Valida los parámetros de fecha antes de enviar la petición
   * @param params Parámetros a validar
   * @returns Array de errores de validación
   */
  validateParams(params: ReporteUnidadLogisticaParams): string[] {
    const errors: string[] = [];

    // Validar condición ENTRE
    if (params.condicionFecha === 'ENTRE') {
      if (!params.fechaDesde || !params.fechaHasta) {
        errors.push('Para la condición ENTRE se requieren ambas fechas: fechaDesde y fechaHasta');
      }
    }

    // Validar clienteCodigo
    if (params.clienteCodigo !== undefined && params.clienteCodigo !== null && params.clienteCodigo <= 0) {
      errors.push('El código de cliente debe ser mayor a 0');
    }

    // Validar pageNumber
    if (params.pageNumber !== undefined && params.pageNumber !== null && params.pageNumber <= 0) {
      errors.push('El número de página debe ser mayor a 0');
    }

    // Validar pageSize
    if (params.pageSize !== undefined && params.pageSize !== null && (params.pageSize <= 0 || params.pageSize > 1000)) {
      errors.push('El tamaño de página debe estar entre 1 y 1000');
    }

    return errors;
  }

  /**
   * Formatea una fecha para el formato esperado por el API
   * @param date Fecha a formatear
   * @returns Fecha en formato YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}