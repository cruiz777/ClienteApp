export interface LocalesRequest {
  id?: number;
  nombre?: string;
  direccion?: string;
  telefono1?: string;
  telefono2?: string;
  telefono3?: string;
  area?: number;
  localRuc?: string;
  administrador?: string;
  fax?: string;
  numeroEmpleados?: number;
  localBodega?: boolean;
  principal?: boolean;
  priopridad?: boolean;
  procentejeDis?: number;
  localHis?: boolean;
  idZona: number;
  idTipoNegocio: number;
  idCiudad?: number;
  idCentroCostos: number;
  idEmpresa: number;
  estado: boolean;
}
