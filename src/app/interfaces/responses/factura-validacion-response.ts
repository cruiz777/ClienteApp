export interface FacturaValidacionResponse {
  success: boolean;
  message: string;
  data?: {
    numeroFactura: string;
    clienteCodigo: number;
    nombreCliente: string;
    fechaFactura: string;
    totalFactura: number;
    totalPagado: number;
    saldoPendiente: number;
    origenDatos: string; // "Nota" o "EstadoCuenta"
    existeEnNota: boolean;
    puedeAplicarNC: boolean;
  };
}