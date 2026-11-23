import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface FilaReversaLiquidacion { id: number; numero: number; idEmpleado: number; cedula: string; nombreCompleto: string; fechaSalida: string; estado: string; revision: string; }
export interface PaginaReversaLiquidacion { total: number; registros: FilaReversaLiquidacion[]; }
export interface ResultadoReversaLiquidacion { idLiquidacion: number; numeroLiquidacion: number; idEmpleado: number; estado: string; provisionesRestauradas: number; fechaSalidaRestaurada: string | null; restauracionExacta: boolean; fechaUtc: string; }

@Injectable({ providedIn: 'root' })
export class ReversaLiquidacionService {
  private readonly url = `${environment.nominaEspecialUrl}/LiquidacionEmpleado/reversas`;
  constructor(private http: HttpClient) {}
  listar(desde: string, hasta: string, pagina: number, tamano: number) {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta).set('pagina', pagina).set('tamano', tamano);
    return this.http.get<{data: PaginaReversaLiquidacion}>(this.url, { params }).pipe(map(r => r.data));
  }
  reversar(fila: FilaReversaLiquidacion, motivo: string, operacionId: string) {
    return this.http.post<{data: ResultadoReversaLiquidacion}>(`${this.url}/${fila.id}`, { motivo, revision: fila.revision, operacionId }).pipe(map(r => r.data));
  }
}
