export interface CreateRpCargosRequest {
  descargo: string;
  responsable: boolean;
  codsec?: string | null;
  horEnf: boolean;
  frmensual: boolean;
  estado: boolean;
  idSectorial?: number | null;
  idEmpresa: number;
}