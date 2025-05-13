export interface DepartamentoRequest {
  id_departamento?: number; // Opcional en creación, requerido en edición
  nombre: string;
  estado: boolean;
}
