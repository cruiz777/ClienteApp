export interface DepartamentoResponse {
  id_departamento: number;
  nombre: string;
  cuenta: string | null; // puede venir null
  id_empresa: number;
  empresa: string;
  estado: boolean;
}
