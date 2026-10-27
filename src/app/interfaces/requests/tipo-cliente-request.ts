// Para crear o editar un tipo de cliente
export interface TipoClienteRequest {
    id_tipo_cliente?: number;
    descripcion: string;
    cuenta: string;
    idEmpresa: number;
    empresa?: string;
    estado: boolean;
  }