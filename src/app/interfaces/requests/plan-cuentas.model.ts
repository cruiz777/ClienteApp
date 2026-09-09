// plan-cuentas.models.ts
export interface PlanCuenta {
  IdPlanCuentas?: number;
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
  CodigoExterno: string;
  Norma: string;
  Alcanse:string;
  Medicion:string;
  IdEmpresa:number;
  Numerocuenta:string | null; 
  Formato:string | null; 
}

export interface Nivel {
  id_nivel: number;     // 1..5
  descripcion: string;
  codigo: string;
}

export interface CodigoEspecial {
  codespecial: number;
  descespecial: string;
}

export interface CabModelo {
  id_cab_modelo: number;
  nombre: string;
  tipo_balance: string;
  control_b: string;
}

export interface TreeNode {
  id?: number;                 // IdPlanCuentas
  label: string;               // NombreCuenta o texto visible
  nivel: number;               // 0 (root), 1..5
  data?: PlanCuenta;           // payload
  children?: TreeNode[];
}