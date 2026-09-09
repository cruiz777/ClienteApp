export interface ClienteBasicoResponse {
  cliente_codigo: number;
  ruc: string;
  razon_social: string;
  representante: string;
  estado_empresa: string;
  ciudad: string;
  canton: string;
  provincia: string;
  zona: string;
  fecha_inicio?: string;
}