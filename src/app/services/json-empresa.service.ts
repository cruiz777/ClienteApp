import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface JsonEmpresaRequest {
  status: string;       // 'ACTIVE' o 'INACTIVE'
  licenceKey: string;
  licenseeName: string;
  licenseeGLN: string;
  streetAddress: string;
  canton: string;
  postalName: string;
  provincia: string;
  ciudad: string;
  postalCode: string;
  email: string;
  telefono: string;
  website: string;
  dapi: string;
  capi: string;

  // Opcional: si algún día quieres forzar el ISO manualmente
  countrySubdivisionCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JsonEmpresaService {
  constructor(private http: HttpClient) {}

  // ✅ Mapa ISO 3166-2 Ecuador
  private readonly provinciasISO: Record<string, string> = {
    'AZUAY': 'EC-A',
    'BOLÍVAR': 'EC-B',
    'BOLIVAR': 'EC-B',
    'CAÑAR': 'EC-F',
    'CANAR': 'EC-F',
    'CARCHI': 'EC-C',
    'CHIMBORAZO': 'EC-H',
    'COTOPAXI': 'EC-X',
    'EL ORO': 'EC-O',
    'ESMERALDAS': 'EC-E',
    'GALÁPAGOS': 'EC-W',
    'GALAPAGOS': 'EC-W',
    'GUAYAS': 'EC-G',
    'IMBABURA': 'EC-I',
    'LOJA': 'EC-L',
    'LOS RÍOS': 'EC-R',
    'LOS RIOS': 'EC-R',
    'MANABÍ': 'EC-M',
    'MANABI': 'EC-M',
    'MORONA SANTIAGO': 'EC-S',
    'NAPO': 'EC-N',
    'ORELLANA': 'EC-D',
    'PASTAZA': 'EC-Y',
    'PICHINCHA': 'EC-P',
    'SANTA ELENA': 'EC-SE',
    'SANTO DOMINGO DE LOS TSÁCHILAS': 'EC-SD',
    'SANTO DOMINGO DE LOS TSACHILAS': 'EC-SD',
    'SUCUMBÍOS': 'EC-U',
    'SUCUMBIOS': 'EC-U',
    'TUNGURAHUA': 'EC-T',
    'ZAMORA CHINCHIPE': 'EC-Z'
  };

  private normalizarProvincia(valor: string): string {
    return (valor || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  private getCodigoSubdivisionEC(provincia: string): string {
    const key = this.normalizarProvincia(provincia);
    return this.provinciasISO[key] || '';
  }

  generarJsonEmpresa(data: JsonEmpresaRequest): void {
    // ✅ Resuelve automáticamente EC-P, EC-G, etc.
    // Si viene forzado en data.countrySubdivisionCode, usa ese.
    const subdivision =
      (data.countrySubdivisionCode || '').trim() ||
      this.getCodigoSubdivisionEC(data.provincia);

    const jsonData = [{
      licenceKey: '786' + (data.licenceKey || ''),
      licenceType: 'GCP',
      licenceStatus: data.status,
      licenseeName: data.licenseeName,
      licenseeGLN: data.licenseeGLN,
      address: {
        streetAddress: {
          language: 'es',
          value: data.streetAddress
        },
        addressLocality: {
          language: 'es',
          value: data.canton
        },
        countryCode: 'EC',
        postalName: {
          language: 'es',
          value: data.postalName
        },
        streetAddressLine2: {
          language: 'es',
          value: 's/n'
        },
        postOfficeBoxNumber: data.postalCode,
        crossStreet: {
          language: 'es',
          value: 's/n'
        },
        addressSuburb: {
          language: 'es',
          value: data.ciudad
        },
        addressRegion: {
          language: 'es',
          value: data.provincia
        },
        postalCode: data.postalCode,

        // ✅ AQUÍ VA EL ISO (EC-P, EC-G, etc.)
        countrySubdivisionCode: subdivision
      },
      contactPoint: [
        {
          email: data.email,
          telephone: data.telefono,
          website: data.website || 'www.gs1ec.org'
        },
        { email: data.email },
        { telephone: '+' + data.telefono }
      ]
    }];

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'APIKey': data.capi
    });

    this.http.post(data.dapi, jsonData, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Enviado correctamente:', response);
        // this.descargarArchivo(jsonData, data.licenceKey);
      },
      error: (error) => {
        console.error('❌ Error al enviar JSON:', error);
        // this.descargarArchivo(jsonData, data.licenceKey);
      }
    });
  }

  private descargarArchivo(jsonData: any, nombre: string): void {
    const blob = new Blob(
      [JSON.stringify(jsonData, null, 2)],
      { type: 'application/json;charset=utf-8' }
    );
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nombreArchivo = `gs1_ec_${nombre}_${fecha}.json`;

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
  }
}
