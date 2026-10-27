import { ExportProductoResponse } from "../responses/products-license-response";

export interface SendToApiRequest {
  apiType: string; // "gtins" o "licencias"
  products: ExportProductoResponse[]; // ✅ Usa ExportProductoResponse
}