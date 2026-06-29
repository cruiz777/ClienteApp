export interface UtilidadesRequest {
  periodo: number;
  montoEmpleados: number;
  montoCargas: number;
  tiposEmpleado: number[];
}

export interface GrabarUtilidadesRequest {
  numPatronal: string;
  periodo: string;
  idTipoNomEsp: number;
  idUsuario: number;
  fechaEmision: string;
  forzar: boolean;
  montoEmpleados: number;
  montoCargas: number;
  tiposEmpleado: number[];
}