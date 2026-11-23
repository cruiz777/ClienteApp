import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SolicitudVacacionesPendiente { idSolicitud: number; fechaDesde: string; dias: number; observacion: string | null; }
export interface EmpleadoVacaciones { idEmpleado: number; nombreCompleto: string; cedula: string; cargo: string; fechaIngreso: string | null; fechaSalida: string | null; }
export interface CalcularVacacionesRequest {
  idEmpleado: number; tipo: string; dias: number; fechaLiquidacion: string; fechaInicio: string | null;
  periodoDesde: string | null; periodoHasta: string | null; noValidarSolicitud: boolean; solicitudes: number[];
}
export interface ProvisionVacaciones {
  idNomProv: number; periodo: string; fecha: string; diasTrabajados: number; ingresos: number;
  diasNormales: number; valorNormal: number; diasAdicionales: number; valorAdicional: number;
  diasNormalesTomados: number; valorNormalTomado: number; diasAdicionalesTomados: number; valorAdicionalTomado: number;
  diasNormalesDisponibles: number; diasAdicionalesDisponibles: number;
  diasNormalesTomar: number; valorNormalTomar: number; diasAdicionalesTomar: number; valorAdicionalTomar: number;
}
export interface LiquidacionVacaciones {
  idLiquidacion: number | null; empleado: EmpleadoVacaciones; solicitud: CalcularVacacionesRequest;
  provisiones: ProvisionVacaciones[]; solicitudesPendientes: SolicitudVacacionesPendiente[]; revision: string;
  diasNormales: number; diasAdicionales: number; diasDisponibles: number; diasNormalesTomar: number;
  diasAdicionalesTomar: number; diasTomar: number; valorNormal: number; valorAdicional: number; total: number; saldoDias: number;
}

@Injectable({ providedIn: 'root' })
export class LiquidacionVacacionesService {
  private readonly url = `${environment.nominaEspecialUrl}/LiquidacionVacaciones`;
  constructor(private http: HttpClient) {}
  consultar(id: number, fecha: string) {
    return this.http.get<{data: LiquidacionVacaciones}>(`${this.url}/empleado/${id}`, { params: new HttpParams().set('fechaLiquidacion', fecha) }).pipe(map(r => r.data));
  }
  calcular(request: CalcularVacacionesRequest) {
    return this.http.post<{data: LiquidacionVacaciones}>(`${this.url}/calcular`, request).pipe(map(r => r.data));
  }
  guardar(calculo: CalcularVacacionesRequest, revision: string, operacionId: string) {
    return this.http.post<{data: LiquidacionVacaciones}>(this.url, { calculo, revision, operacionId }).pipe(map(r => r.data));
  }
  obtener(id: number) { return this.http.get<{data: LiquidacionVacaciones}>(`${this.url}/${id}`).pipe(map(r => r.data)); }
  pdf(id: number) { return this.http.get(`${this.url}/${id}/pdf`, { responseType: 'blob' }); }
}
