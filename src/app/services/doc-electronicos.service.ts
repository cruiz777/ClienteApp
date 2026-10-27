// src/app/services/doc-electronicos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// Interfaz de documento electrónico
export interface DocElectronico {
  id: number;
  tipo: 'FACTURA' | 'NC' | 'ND' | 'RET';
  fechaEmision: string;
  estab: string;
  ptoEmision: string;
  secuencial: string;
  razonSocial: string;
  total: number;
  estado: string;
  fechaAutorizada: string;
  ruc: string;
  claveAcceso: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocElectronicosService {
  
  private baseUrl = `${environment.invoices_sic}/doc-electronicos`;

  constructor(private http: HttpClient) {}

  /** Listar documentos según tipo y filtros */
  listarDocumentos(
    tipo: 'FACTURA' | 'NC' | 'ND' | 'RET',
    fechaDesde?: Date | null,
    fechaHasta?: Date | null,
    textoBusqueda?: string | null
  ): Observable<DocElectronico[]> {
    let params = new HttpParams().set('tipo', tipo);

    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde.toISOString());
    }
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta.toISOString());
    }
    if (textoBusqueda) {
      params = params.set('texto', textoBusqueda);
    }

    return this.http.get<DocElectronico[]>(this.baseUrl, { params });
  }

  /** Obtener el PDF de un documento para imprimirlo */
  obtenerPdfDocumento(
    tipo: 'FACTURA' | 'NC' | 'ND' | 'RET',
    idDocumento: number
  ): Observable<Blob> {
    const params = new HttpParams().set('tipo', tipo);

    return this.http.get(`${this.baseUrl}/${idDocumento}/pdf`, {
      params,
      responseType: 'blob',
    });
  }
}
