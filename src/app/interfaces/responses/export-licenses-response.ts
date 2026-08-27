export interface ExportLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaIgual?: string;
  ruc?: string;
  estadoPrefijo?: boolean;
  estadoEmpresa?: number;
  batchSize?: number;
}

export interface ExportLicenseResponse {
  totalItems: number;
  totalBatches: number;
  batches: ExportLicenseBatch[];
}

export interface ExportLicenseBatch {
  batchNumber: number;
  itemCount: number;
  items: ExportLicenseItem[];
}

export interface ExportLicenseItem {
  licenceKey: string;
  licenceType: string;
  licenceStatus: string;
  licenseeName: string;
  licenseeGLN?: string;

  address: {
    streetAddress: { language: string; value: string };
    addressLocality: { language: string; value: string };
    countryCode: string;
    postalName: { language: string; value: string };
    streetAddressLine2: { language: string; value: string };
    postOfficeBoxNumber: string; // ✅ obligatorio (pero lo arreglamos antes de enviar)
    crossStreet: { language: string; value: string };
    addressSuburb: { language: string; value: string };
    addressRegion: { language: string; value: string };
    postalCode: string;
    countrySubdivisionCode: string;
  };

  contactPoint: Array<{
    email?: string;
    telephone?: string;
    website?: string;
  }>;
}
