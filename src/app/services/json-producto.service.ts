import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JsonProductoService {

  constructor(private http: HttpClient) {}

  generarJson(data: {
    gtin: string,
    brick: any,         // puede ser string o { brick: string }
    prefijo: string,
    marca: string,
    descripcion: string,
    url: string,
    unidad: any,        // puede ser string o { net_content_uom: string }
    contenido: string,
    dapiP: string,
    capiP: string
  }) {
    let codigobar = '';
    let tipoG = '';

    const len = data.gtin.length;
    if (len === 13) {
      codigobar = '0' + data.gtin;
      tipoG = 'GCP';
    } else if (len === 12) {
      codigobar = '00' + data.gtin;
      tipoG = 'GCP';
    } else if (len === 8) {
      codigobar = '000000' + data.gtin;
      tipoG = 'GTIN';
    }

    const gpcCategoryCode = typeof data.brick === 'string'
      ? data.brick
      : data.brick?.brick ?? '';

    const unitCode = typeof data.unidad === 'string'
      ? data.unidad
      : data.unidad?.net_content_uom ?? '';

    const vjson = [{
      gtin: codigobar,
      gtinStatus: 'ACTIVE',
      gpcCategoryCode: gpcCategoryCode,
      licenceKey: '786' + data.prefijo,
      licenceType: tipoG,
      brandName: [{
        language: 'es',
        value: data.marca
      }],
      productDescription: [{
        language: 'es',
        value: data.descripcion
      }],
      productImageUrl: data.url ? [{
        language: 'es',
        value: data.url
      }] : [],
      netContent: [{
        unitCode: unitCode,
        value: data.contenido
      }],
      countryOfSaleCode: ['EC']
    }];

    // 🔒 Comentado para pruebas
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'APIKey': data.capiP
    });

    this.http.post(data.dapiP, vjson, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta:', response);
        this.guardarArchivo(vjson);
      },
      error: (error) => {
        console.error('❌ Error al enviar JSON:', error);
      }
    });

    // ✅ Solo generar y guardar archivo local (sin enviar)
    //this.guardarArchivo(vjson);
  }

  private guardarArchivo(jsonData: any) {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const filename = `786gs1_ec_${new Date().getTime()}.json`;

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}
