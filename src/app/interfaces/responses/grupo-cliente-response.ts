export interface GrupoCliente {
    id_grupo_empresa: number;
    codigo: string;
    nombre: string;
    inscripcion: number;
    asignacion: number;
    mantenimiento: number;
    fecha: string;
    productoInscripcion: string;
    productoMantenimiento: string;
    productoAsignacion: string;
    mantenimientoDolar: number;
    inscripcionDolar: number;
    valorAnual: number;
    estado: boolean;
  }
  
  export interface GrupoClienteListResponse {
    id: string;
    type: 'LIST';
    data: GrupoCliente[];
  }
  
  export interface GrupoClienteResponse {
    id: string;
    type: 'OBJECT';
    data: GrupoCliente;
    message: string;
    count: number | null;
  }