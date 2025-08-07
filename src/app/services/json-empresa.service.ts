import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JsonEmpresaService {
  constructor(private http: HttpClient) {}

  generarJsonEmpresa(data: {
    status: string,       // 'ACTIVE' o 'INACTIVE'
    licenceKey: string,
    licenseeName: string,
    licenseeGLN: string,
    streetAddress: string,
    canton: string,
    postalName: string,
    provincia: string,
    ciudad: string,
    postalCode: string,
    email: string,
    telefono: string,
    website: string,
    dapi: string,
    capi: string
  }) {
    const jsonData = [{
      licenceKey: '786' + data.licenceKey,
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
        countrySubdivisionCode: ''
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
      next: response => {
        console.log('✅ Enviado correctamente:', response);
        //this.descargarArchivo(jsonData, data.licenceKey);
      },
      error: error => {
        console.error('❌ Error al enviar JSON:', error);
        //this.descargarArchivo(jsonData, data.licenceKey);
      }
    });
  }

  private descargarArchivo(jsonData: any, nombre: string) {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8' });
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nombreArchivo = `gs1_ec_${nombre}_${fecha}.json`;

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nombreArchivo;
    link.click();
  }
}
