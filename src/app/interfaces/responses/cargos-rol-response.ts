export interface RpCargosResponse {
  idCargo: number;
  descargo: string;
  responsable: boolean;
  codsec?: string | null;
  horEnf: boolean;
  frmensual: boolean;
  estado: boolean;
  idEmpresa: number;
}