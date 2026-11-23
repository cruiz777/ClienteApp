import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CalcularLiquidacionRequest, LiquidacionCalculoResponse, LiquidacionDetalleResponse } from './liquidacion-empleado.service';

export interface DocumentoFiniquito {
  idLiquidacion: number; numeroLiquidacion: number; fechaEmision: string; estado: string;
  nombreCompleto: string; cedula: string; cargo: string; departamento: string; resultado: LiquidacionCalculoResponse;
}
export interface FilaReimpresion { id: number; numero: number; idEmpleado: number; nombreCompleto: string; cedula: string; cargo: string; fecha: string; fechaSalida: string | null; total: number; estado: string; }
export interface PaginaReimpresion { total: number; registros: FilaReimpresion[]; }

@Injectable({ providedIn: 'root' })
export class DocumentosLiquidacionService {
  private readonly url = environment.nominaEspecialUrl;
  constructor(private http: HttpClient) {}
  guardar(calculo: CalcularLiquidacionRequest, revision: string, operacionId: string, fechaEmision: string, detalles: LiquidacionDetalleResponse[]) {
    return this.http.post<{data: DocumentoFiniquito}>(`${this.url}/LiquidacionEmpleado`, { calculo, revision, operacionId, fechaEmision, detalles }).pipe(map(r => r.data));
  }
  listar(vacaciones: boolean, filtros: { idEmpleado?: number; desde?: string; hasta?: string; pagina: number; tamano: number }) {
    let params = new HttpParams().set('pagina', filtros.pagina).set('tamano', filtros.tamano);
    if (filtros.idEmpleado) params = params.set('idEmpleado', filtros.idEmpleado);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    return this.http.get<{data: PaginaReimpresion}>(`${this.url}/${vacaciones ? 'LiquidacionVacaciones/reimpresiones' : 'LiquidacionEmpleado'}`, { params }).pipe(map(r => r.data));
  }
  pdf(vacaciones: boolean, id: number) {
    return this.http.get(`${this.url}/${vacaciones ? 'LiquidacionVacaciones' : 'LiquidacionEmpleado'}/${id}/pdf`, { responseType: 'blob' });
  }
}
