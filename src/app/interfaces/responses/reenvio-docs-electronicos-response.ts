// src/app/interfaces/responses/documento-electronico-response.ts

export interface DocumentoElectronicoListResponse {
  id: number;
  tipoDocumento: string; // "FACTURA", "NC", "ND", "RETENCION"
  numeroDocumento: string;
  fecha: string; // ISO string
  cliente: string;
  idCliente: number | null;
  rucCliente: string;

  // Totales detallados
  subtotal: number;
  totalSinIva: number;
  totalConIva: number;
  iva: number;
  descuento: number;
  total: number;

  // Datos generales
  caja: string;
  cajero: string | null;
  estado: string;
  xmlGenerado: boolean;
  claveAcceso: string | null;

  // Campos específicos para NC/ND
  numeroFacturaAfectada?: string | null;
  motivoNota?: string | null;
}
