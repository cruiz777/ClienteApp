import { CentroCostosResponse } from './centro-costos-response';
import { TipoNegocioResponse } from './tipo-negocio-response';
import { EmpresaResponse } from './empresa-response';
import { CiudadResumen } from './ciudad-response';

export interface LocalesResponse {
  id: number;
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

  centroCostos?: CentroCostosResponse;
  tipoNegocio?: TipoNegocioResponse;
  ciudad?: CiudadResumen;
  empresa?: EmpresaResponse;
}
