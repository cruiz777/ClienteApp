import { ContadorEmpresa } from "./contador-empresa";
import { GerenteEmpresa } from "./gerente-empresa";

export interface EmpresaResponse {
  empresaCodigo: number;
  empresaNombre?: string;
  empresaSistema?: string;
  empresaRuc?: string;
  empresaDireccion?: string;
  empresaTelefono1?: string;
  empresaTelefono2?: string;
  empresaFax?: string;
  empresaEmail?: string;
  empresaLogo?: string;
  empresaMoneda?: string;
  empresaTipoCambio?: string;
  empresaEstablecimiento?: string;
  empresaTipoFacturacion?: string;
  empresaContribuyenteEspecial?: string;
  empresaObligadoContabilidad: string;
  empresaCodigoEntidad?: string;
  empresaDirectorio?: string;
  status: boolean;
  idCiudad: number;
  gerentes?: GerenteEmpresa[];
  contadores?: ContadorEmpresa[];
}
