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
  empresaFirma: string; 
  empresaMoneda?: string | null;
  empresaTipoCambio?: string | null;
  empresaEstablecimiento?: string | null;
  empresaTipoFacturacion?: string | null;
  empresaContribuyenteEspecial?: string | null;
  empresaObligadoContabilidad: string;
  empresaCodigoEntidad?: string | null;
  empresaDirectorio?: string | null;
  status: boolean;
  idCiudad: number;
  gerentes?: GerenteEmpresa[];
  contadores?: ContadorEmpresa[];
}
