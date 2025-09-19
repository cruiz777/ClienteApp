import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  status: 'SUCCESS' | 'ERROR';
  data: T | null;
  error: string | null;
  total: number;
}

export interface ClienteCodpreGrupoResponse {
  codcli: number;
  ruccli: string;
  nomcli: string;
  ciudad: string;
  codpre: string;
  codigo_Grupo: string;
  mantenimiento: number | null; // mensual (double? en el backend)
  subtotal: number;             // mantenimiento * 12 (calculado en backend)
  iva: number;                  // subtotal * 0.15
  total: number;                // subtotal + iva
  referencia:string;
}

export interface FiltrosCodpreGrupo {
  busquedaGeneral?: string;
  prefijoBusqueda?: string;
  idZona?: number | string | null; // <-- nuevo
}

@Injectable({
  providedIn: 'root'
})
export class FacturaGlobalService {
  private readonly baseUrl = `${environment.invoices_sic}/clientes`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/clientes/codpre-grupo
   * Retorna codcli, ruccli, nomcli, ciudad, codpre, codigo_grupo, mantenimiento,
   * subtotal, iva y total.
   */
 getClientesCodpreGrupo(
  filtros: FiltrosCodpreGrupo = {}
): Observable<ClienteCodpreGrupoResponse[]> {
  let params = new HttpParams();

  if (filtros.busquedaGeneral?.trim()) {
    params = params.set('BusquedaGeneral', filtros.busquedaGeneral.trim());
  }
  if (filtros.prefijoBusqueda?.trim()) {
    params = params.set('PrefijoBusqueda', filtros.prefijoBusqueda.trim());
  }
  // <-- NUEVO: solo si viene y es > 0 (o no vacío)
  if (filtros.idZona != null && String(filtros.idZona).trim() !== '' && Number(filtros.idZona) > 0) {
    params = params.set('IdZona', String(filtros.idZona)); // usa "IdZona" para que empate con el handler .NET
  }

  const url = `${this.baseUrl}/codpre-grupo`;
  return this.http
    .get<ApiResponse<ClienteCodpreGrupoResponse[]>>(url, { params })
    .pipe(map(res => res.data ?? []));
}

}
