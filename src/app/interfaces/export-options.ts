export interface ExportOptions {
  data: any[];
  columns: string[];         // Claves del objeto
  headers: string[];         // Títulos visibles
  filename: string;          // Nombre del archivo sin extensión
  title?: string;            // Título en el encabezado del reporte
  logoUrl?: string;          // URL o base64 del logo
}
