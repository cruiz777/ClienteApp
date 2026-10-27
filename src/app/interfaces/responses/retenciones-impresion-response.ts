export interface RetencionesImpresionDetalleResponse {
  comprobante: string;
  numero: string;
  fecha: string | Date;
  baseImponible: number;
  impuesto: string;
  codigo: string;
  porcentaje: number;
  valor: number;
}

export interface RetencionesImpresionResponse {
  idEmpresa: number;
  idCabMaestro: number;

  numeroComprobanteRetencion: string;
  autorizacion: string;
  ambiente: string;
  emision: string;

  empresaNombre: string;
  empresaRuc: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaContribuyenteEspecial: string;
  empresaObligadoContabilidad: string;
  empresaLeyenda: string;

  logoBase64?: string | null;

  clienteNombre: string;
  clienteRucCi: string;
  clienteDireccion: string;
  clienteTelefono: string;
  clienteEmail: string;
  noAsiento: string;
  fechaEmision: string | Date;

  total: number;
  detalles: RetencionesImpresionDetalleResponse[];
}
