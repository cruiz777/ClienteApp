export interface ClienteLicenseResponse {
  license_key: string;
  license_type: string;
  license_status: string;
  license_name: string;
  license_gln?: string | null;
  address: string;
  address_suburb: string;
  address_locality: string;
  address_region: string;
  telephone: string;
  email: string;
  website: string;
  cliente_codigo: number;
  codigo_prefijo: string;
  ruc: string;
  fecha_ingreso?: string | null; // DateOnly se convierte a string en JSON
}