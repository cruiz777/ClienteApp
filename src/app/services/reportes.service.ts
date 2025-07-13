import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { environment } from 'src/environments/environment';

// ===============================
// INTERFACES DE RESPONSE
// ===============================

export interface ProductoReporteMetadata {
  emisor: string;
  fecha_emision: string;
  pagina: number;
  cliente_codigo: number;
  empresa_nombre: string;
  ruc: string;
  prefijo: string;
  tipo_reporte: string;
}

export interface Codigo14Response {
  gtin_14: string;
  descripcion: string;
  marca: string;
  contenido_neto: string;
  unidad_medida: string;
  fecha: string;
  presentacion?: number;
  unidad?: number;
  largo?: number;
  ancho?: number;
  profundidad?: number;
  peso?: number;
  target: string;
  sector: string;
  referencia: string;
}

export interface ProductoUnidadLogisticaResponse {
  codigo_producto: string;
  descripcion: string;
  marca: string;
  contenido_neto: string;
  unidad_medida: string;
  fecha: string;
  codigos_14: Codigo14Response[];
}

export interface ProductoUnidadLogisticaCompleteResponse {
  metadata: ProductoReporteMetadata;
  productos: PaginationResponse<ProductoUnidadLogisticaResponse>;
}

// ===============================
// NUEVAS INTERFACES PARA PRODUCTOS POR CLIENTE
// ===============================

export interface ProductoCompletoResponse {
  codigo_producto: string;
  descripcion: string;
  marca: string;
  contenido_neto: string;
  unidad_medida: string;
  fecha: string;
  tiene_codigos_14: boolean;
  codigos_14: Codigo14Response[];
}

export interface ProductoCompletoCompleteResponse {
  metadata: ProductoReporteMetadata;
  productos: PaginationResponse<ProductoCompletoResponse>;
}

export interface ProductosPorClienteQuery {
  clienteCodigo: number; // OBLIGATORIO
  codigoProducto?: string;
  fechaDesde?: string; // formato YYYY-MM-DD
  fechaHasta?: string; // formato YYYY-MM-DD
  condicionFecha?: 'IGUAL' | 'MENOR_IGUAL' | 'MAYOR_IGUAL' | 'MAYOR' | 'ENTRE';
  estado?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ===============================
// INTERFACES DE QUERY
// ===============================

export interface ReporteUnidadLogisticaQuery {
  prefijo?: string;
  clienteCodigo?: number;
  codigoProducto?: string;
  fechaDesde?: string; // formato YYYY-MM-DD
  fechaHasta?: string; // formato YYYY-MM-DD
  condicionFecha?: 'IGUAL' | 'MENOR_IGUAL' | 'MAYOR_IGUAL' | 'MAYOR' | 'ENTRE';
  estado?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private baseUrl = environment.reportsUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene reporte de productos con unidad logística (solo productos con códigos 14)
   * @param query Parámetros de búsqueda y filtros
   * @returns Observable con la respuesta paginada de productos
   */
  getReporteUnidadLogistica(query?: ReporteUnidadLogisticaQuery): Observable<ApiResponse<ProductoUnidadLogisticaCompleteResponse>> {
    let params = new HttpParams();
    
    if (query) {
      // Agregar parámetros solo si tienen valor
      if (query.prefijo) {
        params = params.set('prefijo', query.prefijo);
      }
      if (query.clienteCodigo !== undefined && query.clienteCodigo > 0) {
        params = params.set('clienteCodigo', query.clienteCodigo.toString());
      }
      if (query.codigoProducto) {
        params = params.set('codigoProducto', query.codigoProducto);
      }
      if (query.fechaDesde) {
        params = params.set('fechaDesde', query.fechaDesde);
      }
      if (query.fechaHasta) {
        params = params.set('fechaHasta', query.fechaHasta);
      }
      if (query.condicionFecha) {
        params = params.set('condicionFecha', query.condicionFecha);
      }
      if (query.estado !== undefined) {
        params = params.set('estado', query.estado.toString());
      }
      if (query.pageNumber) {
        params = params.set('pageNumber', query.pageNumber.toString());
      }
      if (query.pageSize) {
        params = params.set('pageSize', query.pageSize.toString());
      }
    }

    return this.http.get<ApiResponse<ProductoUnidadLogisticaCompleteResponse>>(
      `${this.baseUrl}/ProductosReportes/unidad-logistica`, 
      { params }
    );
  }

  /**
   * Método helper para obtener reporte de unidad logística con parámetros individuales
   */
  getReporteUnidadLogisticaSimple(
    prefijo?: string,
    clienteCodigo?: number,
    codigoProducto?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    condicionFecha?: 'IGUAL' | 'MENOR_IGUAL' | 'MAYOR_IGUAL' | 'MAYOR' | 'ENTRE',
    estado?: boolean,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ApiResponse<ProductoUnidadLogisticaCompleteResponse>> {
    const query: ReporteUnidadLogisticaQuery = {
      prefijo,
      clienteCodigo,
      codigoProducto,
      fechaDesde,
      fechaHasta,
      condicionFecha,
      estado,
      pageNumber,
      pageSize
    };

    return this.getReporteUnidadLogistica(query);
  }

  /**
   * Convierte una fecha Date a formato YYYY-MM-DD para el backend
   */
  formatDateForApi(date: any): string {
    // Si es null o undefined, retornar string vacío
    if (date == null || date === undefined) {
        console.warn('formatDateForApi recibió un valor null/undefined:', date);
        return '';
    }

    let dateObj: Date;

    // Si ya es un Date nativo
    if (date instanceof Date) {
        dateObj = date;
    }
    // Si es un objeto Moment (de MomentDateAdapter)
    else if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
    }
    // Si es un objeto Moment con format (otra variante)
    else if (date && typeof date.format === 'function') {
        dateObj = new Date(date.format('YYYY-MM-DD'));
    }
    // Si es un string
    else if (typeof date === 'string') {
        dateObj = new Date(date);
    }
    // Si es un número (timestamp)
    else if (typeof date === 'number') {
        dateObj = new Date(date);
    }
    // Si tiene propiedades year, month, day (algunos date adapters)
    else if (date && typeof date === 'object' && date.year !== undefined) {
        dateObj = new Date(date.year, date.month, date.day);
    }
    // Último recurso: intentar convertir a Date
    else {
        dateObj = new Date(date);
    }

    // Validar que la fecha es válida
    if (isNaN(dateObj.getTime())) {
        console.error('Fecha inválida:', date);
        return '';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convierte una fecha string (YYYY-MM-DD) a Date
   */
  parseApiDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00');
  }

  /**
   * Valida los parámetros antes de enviar la petición
   */
  validateParams(query: ReporteUnidadLogisticaQuery): string[] {
    const errors: string[] = [];

    if (query.pageNumber !== undefined && query.pageNumber <= 0) {
      errors.push('El número de página debe ser mayor a 0');
    }

    if (query.pageSize !== undefined && (query.pageSize <= 0 || query.pageSize > 1000)) {
      errors.push('El tamaño de página debe estar entre 1 y 1000');
    }

    if (query.clienteCodigo !== undefined && query.clienteCodigo <= 0) {
      errors.push('El código de cliente debe ser mayor a 0');
    }

    if (query.condicionFecha === 'ENTRE' && (!query.fechaDesde || !query.fechaHasta)) {
      errors.push('Para la condición ENTRE se requieren ambas fechas: fechaDesde y fechaHasta');
    }

    if (query.fechaDesde && query.fechaHasta) {
      const fechaDesde = new Date(query.fechaDesde);
      const fechaHasta = new Date(query.fechaHasta);
      
      if (fechaDesde > fechaHasta) {
        errors.push('La fecha desde no puede ser mayor a la fecha hasta');
      }
    }

    return errors;
  }
  /**
 * Obtiene todos los productos de un cliente con sus códigos de barras (GTIN-13 y GTIN-14)
 * @param query Parámetros de búsqueda con código de cliente obligatorio
 * @returns Observable con la respuesta paginada de productos del cliente
 */
getProductosPorCliente(query: ProductosPorClienteQuery): Observable<ApiResponse<ProductoCompletoCompleteResponse>> {
  let params = new HttpParams();
  
  // Agregar parámetros solo si tienen valor
  if (query.codigoProducto) {
    params = params.set('codigoProducto', query.codigoProducto);
  }
  if (query.fechaDesde) {
    params = params.set('fechaDesde', query.fechaDesde);
  }
  if (query.fechaHasta) {
    params = params.set('fechaHasta', query.fechaHasta);
  }
  if (query.condicionFecha) {
    params = params.set('condicionFecha', query.condicionFecha);
  }
  if (query.estado !== undefined) {
    params = params.set('estado', query.estado.toString());
  }
  if (query.pageNumber) {
    params = params.set('pageNumber', query.pageNumber.toString());
  }
  if (query.pageSize) {
    params = params.set('pageSize', query.pageSize.toString());
  }

  return this.http.get<ApiResponse<ProductoCompletoCompleteResponse>>(
    `${this.baseUrl}/Producto/cliente/${query.clienteCodigo}`, 
    { params }
  );
}

/**
 * Método helper para obtener productos por cliente con parámetros individuales
 */
getProductosPorClienteSimple(
  clienteCodigo: number,
  codigoProducto?: string,
  fechaDesde?: string,
  fechaHasta?: string,
  condicionFecha?: 'IGUAL' | 'MENOR_IGUAL' | 'MAYOR_IGUAL' | 'MAYOR' | 'ENTRE',
  estado?: boolean,
  pageNumber: number = 1,
  pageSize: number = 50
): Observable<ApiResponse<ProductoCompletoCompleteResponse>> {
  const query: ProductosPorClienteQuery = {
    clienteCodigo,
    codigoProducto,
    fechaDesde,
    fechaHasta,
    condicionFecha,
    estado,
    pageNumber,
    pageSize
  };

  return this.getProductosPorCliente(query);
}

/**
 * Valida los parámetros para productos por cliente antes de enviar la petición
 */
validateProductosPorClienteParams(query: ProductosPorClienteQuery): string[] {
  const errors: string[] = [];

  // Cliente código es obligatorio
  if (!query.clienteCodigo || query.clienteCodigo <= 0) {
    errors.push('El código de cliente es obligatorio y debe ser mayor a 0');
  }

  if (query.pageNumber !== undefined && query.pageNumber <= 0) {
    errors.push('El número de página debe ser mayor a 0');
  }

  if (query.pageSize !== undefined && (query.pageSize <= 0 || query.pageSize > 1000)) {
    errors.push('El tamaño de página debe estar entre 1 y 1000');
  }

  if (query.condicionFecha === 'ENTRE' && (!query.fechaDesde || !query.fechaHasta)) {
    errors.push('Para la condición ENTRE se requieren ambas fechas: fechaDesde y fechaHasta');
  }

  if (query.fechaDesde && query.fechaHasta) {
    const fechaDesde = new Date(query.fechaDesde);
    const fechaHasta = new Date(query.fechaHasta);
    
    if (fechaDesde > fechaHasta) {
      errors.push('La fecha desde no puede ser mayor a la fecha hasta');
    }
  }

  return errors;
}
}