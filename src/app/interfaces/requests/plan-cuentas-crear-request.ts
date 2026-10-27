export interface PlanCuenta {
  CuentaPrincipal: string;
  CuentaMayor: string;
  CuentaSubcta: string;
  CuentaPresentacion: string;
  NombreCuenta: string;
  IdCodigoEspecial: number | null;
  IdNivel: number;
  Descripcion: string;
  CuentaHomologacion: string;
  PorcentajeRetencion: number;
  Estado: boolean;
  FechaActivacion: string; // YYYY-MM-DD
  IdUsuario: number;
  IdCabModelo: number | null;
  ParentId: number | null;
  EsMovimiento: boolean;
  Orden: number;
  CuentaDetalle: string;
  CodigoCompleto: string;
  IdPlanCuentas: number;
}