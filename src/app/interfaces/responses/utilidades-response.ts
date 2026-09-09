export interface UtilidadEmpleadoResponse {
  idEmpleado: number;
  local: string | null;
  numeroAfiliacion: number | null;
  codigoSectorial: string | null;
  cedula: string | null;
  nombre: string | null;
  conyuge: boolean;
  hijos: number;
  numeroDias: number;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  alicuotaEmpleado: number;
  alicuotaCarga: number;
  valorEmpleado: number;
  valorCarga: number;
  observaciones: string | null;
  genero: string | null;
}