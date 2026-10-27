export interface ClienteValidadoResultadoDTO {
  clienteId: number;
  datosValidados: ClienteValidadoDTO;
  seleccionado?: boolean;
}

export interface ClienteValidadoDTO {
  razonSocial: string;
  numeroRuc: string;
  representante: string;
  estadoContribuyente: string;
  fechaInicioActividad?: string;
  fechaCeseActividad?: string;
  motivoCese?: string;
  ciudad?: string;
  canton?: string;
  provincia?: string;
}
