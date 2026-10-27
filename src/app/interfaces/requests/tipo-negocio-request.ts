export interface TipoNegocioRequest {
  id?: number;
  descripcion: string;
  estado: boolean;
  idEmpresa?: number | null;
}
