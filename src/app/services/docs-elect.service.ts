// docs-elect.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// ========================================
// INTERFACES (COPIA EXACTA DEL BACKEND)
// ========================================
// ========================================
// INTERFACES - COMPARACIÓN ERP
// ========================================

export interface DocumentoErpResponse {
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  rucCliente: string | null;
  nombreCliente: string | null;
  total: number;
  claveAcceso: string | null;
  establecimiento: string | null;
  puntoEmision: string | null;
  secuencial: string | null;
  tieneClaveAcceso: boolean;
  baseCero:          number;
  baseIva:           number;
  totalIva:          number;
  descuento:         number;
  numeroFacturaRef:  string | null;
  fechaFacturaRef:   string | null;
  estaAnulado: boolean; 
}

export interface ComparacionDocumento {
  // Datos del ERP
  erp: DocumentoErpResponse;

  // Resultado del cruce
  estadoComparacion: 'AUTORIZADO' | 'NO_AUTORIZADO' | 'NO_ENCONTRADO';

  // Datos del doc_electronicos si se encontró
  docElectronico?: DocumentoEstadoResponse | null;
}

export type EstadoComparacion = 'AUTORIZADO' | 'NO_AUTORIZADO' | 'NO_ENCONTRADO';
export interface DocumentoGrid {
  id: number;
  tipo: string;
  fechaEmision: string;
  estab: string;
  ptoEmision: string;
  secuencial: string;
  razonSocial: string;
  idEstado: string;
  total: number;
  estado: string;
  fechaAutorizada: string | null;
  ruc: string;
  claveAcceso: string;
  puedeReimprimir: boolean;
  estaAnulado: boolean;
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
export interface ReenviarEmailRequest {
  clave_acceso: string;
  correos_destino?: string; // Opcional: si no se envía, usa los del XML
}

export interface ReenviarEmailResponse {
  clave_acceso: string;
  correo_enviado_a: string;
  fecha_envio: string;
  tipo_documento: string;
  numero_documento: string;
}

export interface ComparacionFila {
  estadoComparacion: EstadoComparacion;
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  rucCliente: string;
  nombreCliente: string;
  total: number;
  claveAcceso: string;
  observacion: string;
  fechaAutorizacion: string | null;
}
export type TipoDocumento = 'FACTURA' | 'NC' | 'ND' | 'RET' | 'LIQUIDACION';

// ========================================
// SERVICIO
// ========================================

@Injectable({
  providedIn: 'root',
})
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.docs}/Documentos`;
  private readonly baseUrlErp = `${environment.docsLocal}/Comparacion`; 

  private readonly tipoDocumentoMapSri: Record<TipoDocumento, string> = {
    FACTURA:     'FACTURA',
    NC:          'NOTA DE CREDITO',
    ND:          'NOTA DE DEBITO',
    RET:         'RETENCION',
    LIQUIDACION: 'LIQUIDACION DE COMPRA',
  };
  private readonly tipoDocumentoMapErp: Record<TipoDocumento, string> = {
    FACTURA:     'FACTURA',
    NC:          'NOTA_CREDITO',
    ND:          'NOTA_DEBITO',
    RET:         'RETENCION',
    LIQUIDACION: 'LIQUIDACION',
  };

  listarDocumentos(
    tipoDocumento: TipoDocumento,
    fechaDesde?: Date | null,
    fechaHasta?: Date | null,
    textoBusqueda?: string,
    page: number = 1,        // ⬅️ YA ESTÁ
    pageSize: number = 20,    // ⬅️ YA ESTÁ
    soloAnulados?: boolean | null  
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

    const tipoBackend = this.tipoDocumentoMapSri[tipoDocumento];
    if (tipoBackend) {
      params = params.set('tipoDocumento', tipoBackend);
    }

    if (textoBusqueda && textoBusqueda.trim()) {
      params = params.set('razonSocialComprador', textoBusqueda.trim());
    }
    if (soloAnulados !== null && soloAnulados !== undefined) {
        params = params.set('soloAnulados', soloAnulados.toString());
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
            idEstado: doc.estado || '', 
            fechaAutorizada: doc.fecha_autorizacion
              ? this.formatearFechaDisplay(doc.fecha_autorizacion)
              : null,
            ruc: doc.identificacion_comprador || '',
            claveAcceso: doc.clave_acceso || '',
            puedeReimprimir: doc.puede_reimprimir || false,
            estaAnulado: (doc.observacion || '').toUpperCase().includes('ANULA')
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

  //Obtiene los pdfs como buffers para poder concatenarlos 
  obtenerPDFComoArrayBuffer(claveAcceso: string): Observable<ArrayBuffer> {
    const params = new HttpParams().set('tipoArchivo', 'PDF');
    return this.http.get(`${this.baseUrl}/descargar/${claveAcceso}`, {
      params,
      responseType: 'arraybuffer'
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`❌ Error al obtener PDF como buffer [${claveAcceso}]:`, error);
        return throwError(() => new Error(error.message || 'Error al descargar PDF'));
      })
    );
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
  /**
   * Reenvía un documento electrónico por correo (XML + PDF)
   * @param claveAcceso - Clave de acceso del documento
   * @param correos - Correos separados por coma o punto y coma (opcional)
   */
  reenviarDocumento(
    claveAcceso: string,
    correos?: string
  ): Observable<ApiResponse<ReenviarEmailResponse>> {
    const body: ReenviarEmailRequest = {
      clave_acceso: claveAcceso,
      correos_destino: correos || undefined
    };

    return this.http.post<ApiResponse<ReenviarEmailResponse>>(
      `${this.baseUrl}/reenviar-email`,
      body
    ).pipe(
      tap((response) => {
        if (response.type === 'success') {
          console.log('✅ Correo enviado exitosamente:', response.data);
        } else {
          console.warn('⚠️ Advertencia al enviar:', response.message);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error al reenviar correo:', error);
        return throwError(() => new Error(
          error.error?.message || error.message || 'Error al reenviar el correo'
        ));
      })
    );
  }

  // ── NUEVO MÉTODO: Traer documentos emitidos desde el ERP ──────────────────
  obtenerDocumentosErp(
    fechaInicio: Date,
    fechaFin: Date,
    tipoDocumento?: string | null,
    idEmpresa?: number | null,
    page: number = 1,
    pageSize: number = 9999,  // Pedimos más porque vamos a cruzar en memoria
    soloAnulados?: boolean | null 
  ): Observable<{ docs: DocumentoErpResponse[]; totalItems: number }> {
    let params = new HttpParams()
      .set('fechaInicio', this.formatearFecha(fechaInicio))
      .set('fechaFin', this.formatearFecha(fechaFin))
      .set('page', page)
      .set('pageSize', pageSize);

    if (tipoDocumento) {
      const tipoMapeado = this.tipoDocumentoMapErp[tipoDocumento as TipoDocumento] ?? tipoDocumento;
      params = params.set('tipoDocumento', tipoMapeado);
    }

    if (idEmpresa) {
      params = params.set('idEmpresa', idEmpresa);
    }
    
    if (soloAnulados !== null && soloAnulados !== undefined) {
      params = params.set('soloAnulados', soloAnulados.toString());
    }
    return this.http
      .get<ApiResponse<PaginationResponse<DocumentoErpResponse>>>(
        `${this.baseUrlErp}/documentos-erp`,
        { params }
      )
      .pipe(
        map((response) => {
          if (!response?.data?.items) {
            return { docs: [], totalItems: 0 };
          }
          return {
            docs: response.data.items,
            totalItems: response.data.totalItems,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('💥 ERROR al obtener docs ERP:', error);
          return throwError(() => new Error(error.message || 'Error desconocido'));
        })
      );
  }

  // ── NUEVO MÉTODO: Cruzar ERP vs doc_electronicos ──────────────────────────
  cruzarDocumentos(
    docsErp: DocumentoErpResponse[],
    docsElectronicos: DocumentoEstadoResponse[]
  ): ComparacionDocumento[] {
    return docsErp.map((erp) => {
      let docElectronico: DocumentoEstadoResponse | undefined;

      if (erp.claveAcceso) {
        //Match directo por ClaveAcceso
        docElectronico = docsElectronicos.find(
          (d) => d.clave_acceso === erp.claveAcceso
        );
      } else if (erp.establecimiento && erp.secuencial) {
        //Fallback: usar establecimiento/puntoEmision/secuencial
        // que el SRI YA extrae via DocumentoHelper
        docElectronico = docsElectronicos.find((d) => {
          return (
            d.establecimiento === erp.establecimiento &&
            d.punto_emision === erp.puntoEmision &&
            d.secuencial === erp.secuencial
          );
        });
      }

      let estadoComparacion: EstadoComparacion;

      if (!docElectronico) {
        estadoComparacion = 'NO_ENCONTRADO';   // ❌ Rojo
      } else if (docElectronico.observacion?.includes('AUTORIZADO')) {
        estadoComparacion = 'AUTORIZADO';       // ⬜ Normal
      } else {
        estadoComparacion = 'NO_AUTORIZADO';   // 🟡 Amarillo
      }

      return { erp, estadoComparacion, docElectronico: docElectronico ?? null };
    });
  }

  // Traer TODOS los tipos de doc_electronicos (sin filtro de tipo)
  listarTodosDocumentosRaw(
    fechaDesde: Date,
    fechaHasta: Date,
    page: number = 1,
    pageSize: number = 500
  ): Observable<{ docs: DocumentoEstadoResponse[]; totalItems: number }> {
    const params = new HttpParams()
      .set('idEmisor', environment.idEmisorPorDefecto)
      .set('page', page)
      .set('pageSize', pageSize)
      .set('orderBy', 'fecha_emision')
      .set('orderDirection', 'desc')
      .set('fechaEmisionDesde', this.formatearFecha(fechaDesde))
      .set('fechaEmisionHasta', this.formatearFecha(fechaHasta));

    return this.http
      .get<ApiResponse<PaginationResponse<DocumentoEstadoResponse>>>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          if (!response?.data?.items) return { docs: [], totalItems: 0 };
          return {
            docs: response.data.items,
            totalItems: response.data.totalItems,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('ERROR listarTodosDocumentosRaw:', error);
          return throwError(() => new Error(error.message || 'Error desconocido'));
        })
      );
  }
}
