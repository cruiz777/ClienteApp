export interface CuponResponse {
  id_cupon: number;
  codigoCupon: string;
  id_cliente: number;
  idPrefijo: number;
  serial: number;
  fechaInicio?: string;
  fechaCaducidad?: string;
  estado?: boolean;
}
