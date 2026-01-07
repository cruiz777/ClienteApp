// docs-elect.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// ========================================
// INTERFACES (COPIA EXACTA DEL BACKEND)
// ========================================

export interface DocumentoGrid {
  id: number;
  tipo: string;
  fechaEmision: string;
  estab: string;
  ptoEmision: string;
  secuencial: string;
  razonSocial: string;
  total: number;
  estado: string;
  fechaAutorizada: string | null;
  ruc: string;
  claveAcceso: string;
  puedeReimprimir: boolean;
}

export interface DocumentoEstadoResponse {
  id_estado_documento: number;
  fecha_emision: string;
  establecimiento: string;
  punto_emision: string;
  secuencial: string;
  razon_social_comprador: string;
  identificacion_comprador: string;
  total_documento: number;
  estado: string;
  observacion: string;
  fecha_autorizacion: string | null;
  clave_acceso: string;
  tipo_documento: string;
  puede_reimprimir: boolean;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  message?: string;
  nextPage?: number | null;
  previousPage?: number | null;
}

export interface ApiResponse<T> {
  id: string;
  type: 'success' | 'error' | 'warning';
  data: T | null;
  message?: string;
  count?: number;
}

export type TipoDocumento = 'FACTURA' | 'NC' | 'ND' | 'RET';

// ========================================
// SERVICIO
// ========================================

@Injectable({
  providedIn: 'root',
})
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.docs}/Documentos`;

    private readonly tipoDocumentoMap: Record<TipoDocumento, string> = {
    FACTURA: 'FACTURA',
    NC: 'NOTA DE CREDITO',    // Con espacios
    ND: 'NOTA DE DEBITO',     // Con espacios
    RET: 'RETENCION',
  };

  listarDocumentos(
    tipoDocumento: TipoDocumento,
    fechaDesde?: Date | null,
    fechaHasta?: Date | null,
    textoBusqueda?: string,
    page: number = 1,        // ⬅️ YA ESTÁ
    pageSize: number = 20    // ⬅️ YA ESTÁ
  ): Observable<{ docs: DocumentoGrid[], totalItems: number }> { // ⬅️ CAMBIAR TIPO DE RETORNO
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const fechaDesdeDefault = fechaDesde || primerDiaMes;
    const fechaHastaDefault = fechaHasta || hoy;

    let params = new HttpParams()
      .set('idEmisor', environment.idEmisorPorDefecto)
      .set('page', page)           // ⬅️ USAR PARÁMETRO
      .set('pageSize', pageSize)   // ⬅️ USAR PARÁMETRO
      .set('orderBy', 'fecha_emision')
      .set('orderDirection', 'desc')
      .set('fechaEmisionDesde', this.formatearFecha(fechaDesdeDefault))
      .set('fechaEmisionHasta', this.formatearFecha(fechaHastaDefault));

    const tipoBackend = this.tipoDocumentoMap[tipoDocumento];
    if (tipoBackend) {
      params = params.set('tipoDocumento', tipoBackend);
    }

    if (textoBusqueda && textoBusqueda.trim()) {
      params = params.set('razonSocialComprador', textoBusqueda.trim());
    }

    return this.http
      .get<ApiResponse<PaginationResponse<DocumentoEstadoResponse>>>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          if (!response || response.type !== 'success' || !response.data || !response.data.items) {
            return { docs: [], totalItems: 0 }; // ⬅️ RETORNAR OBJETO
          }

          const documentos = response.data.items.map((doc) => ({
            id: doc.id_estado_documento,
            tipo: doc.tipo_documento || '',
            fechaEmision: this.formatearFechaDisplay(doc.fecha_emision),
            estab: doc.establecimiento || '',
            ptoEmision: doc.punto_emision || '',
            secuencial: doc.secuencial || '',
            razonSocial: doc.razon_social_comprador || '',
            total: doc.total_documento || 0,
            estado: doc.observacion || '',
            fechaAutorizada: doc.fecha_autorizacion
              ? this.formatearFechaDisplay(doc.fecha_autorizacion)
              : null,
            ruc: doc.identificacion_comprador || '',
            claveAcceso: doc.clave_acceso || '',
            puedeReimprimir: doc.puede_reimprimir || false,
          }));

          return {
            docs: documentos,
            totalItems: response.data.totalItems // ⬅️ RETORNAR TOTAL
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('💥 ERROR HTTP:', error);
          return throwError(() => new Error(error.message || 'Error desconocido'));
        })
      );
  }

  obtenerDetalle(id: number): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${id}`).pipe(
      tap((response) => console.log('Detalle:', response)),
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  descargarPDF(claveAcceso: string): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('tipoArchivo', 'PDF');
    return this.http.get(`${this.baseUrl}/descargar/${claveAcceso}`, {
      params,
      responseType: 'blob',
      observe: 'response' //AGREGAR ESTO
    });
  }


  
  descargarXML(claveAcceso: string): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('tipoArchivo', 'XML');
    return this.http.get(`${this.baseUrl}/descargar/${claveAcceso}`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  anularDocumento(id: number, observacion: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/anular/${id}`, {
      observacion,
    });
  }

  abrirPDF(claveAcceso: string): void {
    console.log('📄 Descargando/Abriendo PDF:', claveAcceso);
    
    this.descargarPDF(claveAcceso).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        // Extraer nombre del archivo
        const contentDisposition = response.headers.get('Content-Disposition');
        let nombreArchivo = `${claveAcceso}.pdf`;

        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches && matches[1]) {
            nombreArchivo = matches[1].replace(/['"]/g, '');
          }
        }

        // ✅ FORZAR DESCARGA (el navegador puede abrirlo automáticamente según configuración)
        const blobWithType = new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(blobWithType);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo; // ⬅️ Esto fuerza el nombre correcto
        link.click();
        
        URL.revokeObjectURL(url);
      
      },
      error: (error) => {
        console.error('Error al descargar PDF:', error);
      }
    });
  }

  descargarYGuardar(claveAcceso: string, tipo: 'PDF' | 'XML'): void {
    const descarga$ = tipo === 'PDF' ? this.descargarPDF(claveAcceso) : this.descargarXML(claveAcceso);

    descarga$.subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        // ✅ EXTRAER EL NOMBRE DESDE LOS HEADERS
        const contentDisposition = response.headers.get('Content-Disposition');
        let nombreArchivo = `${claveAcceso}.${tipo.toLowerCase()}`; // Fallback

        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches && matches[1]) {
            nombreArchivo = matches[1].replace(/['"]/g, '');
          }
        }

        // Descargar con el nombre correcto
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo; //USAR NOMBRE REAL DEL ARCHIVO
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => console.error(`Error al descargar ${tipo}:`, error),
    });
  }

  private formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatearFechaDisplay(fechaISO: string): string {
    try {
      const [year, month, day] = fechaISO.split('-');
      return `${day}-${month}-${year}`;
    } catch {
      return fechaISO;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      mensaje = error.error.message;
    } else {
      mensaje = `Error ${error.status}: ${error.message}`;
    }

    console.error('Error en servicio:', mensaje);
    return throwError(() => new Error(mensaje));
  }
}
