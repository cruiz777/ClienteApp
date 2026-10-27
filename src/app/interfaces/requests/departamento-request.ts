export interface DepartamentoRequest {
  id_departamento?: number;
  id_sub_division?: number;
  descripcion?: string;
  estado?: boolean;
}



export interface DepartamentoRequest1 {
  id_departamento?: number; // Opcional en creación, requerido en edición
  nombre: string;
  estado: boolean;
}
