import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ParametrosSic {
  id_parametro: number;
  id_empresa: number;
  codcueiva: string;
  codcuedesc: string;
  codcueimprenta: string;
  codcueretiva: string;
  ivaservicio: number;
  ivamercaderia: number;
  imprenta: number;
  iva: number;
  codigo_iva_sri: string;
  factura_preimpresa: boolean;
  habilita_cupo: boolean;
  cta_division: boolean;
  cta_subdivision: boolean;
  cta_departamento: boolean;
  cta_grupo: boolean;
  cta_seccion: boolean;
  cta_producto: boolean;
  codcue_ctaxpag: string;
  stock_max: number;
  stock_min: number;
  regalia: number;
  tipo_regalia: string;
  inventariar: boolean;
  caducidad: boolean;
  pais: number;
  zona: number;
  ivacompra: number;
  codcue_inventarios: string;
  codcue_ivacompra: string;
  cambiar_codpro: boolean;
  costo_general: boolean;
  varios_locales: boolean;
  opcion1: boolean;
  num_fondo_inicial: number;
  recibir_con_orden: boolean;
  codpre: boolean;
  activa_bod: boolean;
  activa_usu: boolean;
  prodcomp: boolean;
  icxcconta: boolean;
  pos_dec: number;
  iprincipal: string;
  isecundaria1: string;
  isecundaria2: string;
  codcue_anticipo: string;
  codcue_diff: string;
}

export interface ParametrosSicApiResponse {
  id: string;
  type: string;
  data: ParametrosSic;
  message: string;
  count: number | null;
}

@Injectable({ providedIn: 'root' })
export class ParametrosSicService {
  private readonly baseUrl = `${environment.invoices_sic}/ParametrosSic`;

  constructor(private http: HttpClient) {}

  getByEmpresa(idEmpresa: number): Observable<ParametrosSic> {
    return this.http
      .get<ParametrosSicApiResponse>(`${this.baseUrl}/empresa/${idEmpresa}`)
      .pipe(
        map(resp => resp.data),
        catchError((err: HttpErrorResponse) => {
          // ⚠️ Parche: si el backend manda 400 pero en el body viene el mismo objeto
          const apiResp = err.error as ParametrosSicApiResponse;

          if (err.status === 400 && apiResp && apiResp.data) {
            console.warn('Backend devolvió 400 pero con datos válidos, usando data igual.');
            return of(apiResp.data);   // convertimos el “error” en un resultado normal
          }

          // otros errores sí se propagan
          return throwError(() => err);
        })
      );
  }
}
