export interface FormaPagoCgRequest {
  idFormaPagoCg: number;
  idEmpresa:number;
  descripcion: string;
  activo: boolean | number;
  aplicaPlanPagos: number;  
}

