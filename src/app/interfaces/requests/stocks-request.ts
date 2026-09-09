export interface StockRequest {
  idlocal: number;
  cantidad?: number;
  stockmin?: number | null;
  stockmax?: number | null;
}