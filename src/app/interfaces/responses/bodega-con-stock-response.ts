
export interface BodegaConStockResponse {
  id_local: number;
  nombre_local: string;
  existencia: number;
  reservado: number | null;
  stock_min: number | null;
  stock_max: number | null;
}
