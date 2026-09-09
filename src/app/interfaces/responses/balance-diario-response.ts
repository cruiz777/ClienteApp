// balance-diario-response.model.ts
import { BalanceDiarioDetalleResponse } from './balance-diario-detalle-response';

export interface BalanceDiarioResponse {
  tipo?: string;
  documento?: number;
  anio?: string;
  fechaTransaccion?: string;
  fechaIngreso?: string;
  observacion?: string;
  beneficiario?: string;
  debe?: number;
  haber?: number;
  codResponsable?: string;
  nomResponsable?: string;
  detalles?: BalanceDiarioDetalleResponse[];
}

