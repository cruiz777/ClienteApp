export interface UpdateClienteRequest {
  razonSocial?: string;
  nomCli?: string;
  representante?: string;
  idEstadoEmpresa?: number;
  fechaCeseAct?: string | null; // Permitir null explícitamente
  motivoCeseAct?: string;
  fecnac?: string | null; // Permitir null explícitamente
}