// Para leer un tipo de cliente
export interface TipoClienteResponse {
    id_tipo_cliente: number;
    descripcion: string;
    cuenta: string;
    id_empresa: number;
    empresa: string;
    estado: boolean;
  }
  
  // Para manejar la respuesta de lista
  export interface TipoClienteListResponse {
    id: string;
    type: string;
    data: TipoClienteResponse[];
    message: string;
    count: number | null;
  }