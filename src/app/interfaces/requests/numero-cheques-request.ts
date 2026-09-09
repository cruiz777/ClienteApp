export interface NumeroChequesRequest {
  IdNroCheque: number;
  CuentaBanco: string;
  NumCheque: number;
  NumTra: number;
  Estado: string;
  Ocupado: boolean;
  NumTragGlobal:number;
  IdEmpresa: number;
  IdPlanCuentas:number;
}