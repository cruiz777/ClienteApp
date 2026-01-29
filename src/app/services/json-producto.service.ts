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

    // ✅ 1) Normaliza el gtin (evita espacios y errores de longitud)
    const gtinRaw = (data.gtin ?? '').toString().trim();

    const len = gtinRaw.length;
    if (len === 13) {
      codigobar = '0' + gtinRaw;
      tipoG = 'GCP';
    } else if (len === 12) {
      codigobar = '00' + gtinRaw;
      tipoG = 'GTIN'; // ✅ VB6: para 12 dígitos es GTIN, NO GCP
    } else if (len === 8) {
      codigobar = '000000' + gtinRaw;
      tipoG = 'GTIN';
    } else {
      // Por si ya viene 14 o viene con formato distinto
      codigobar = gtinRaw;
      // tipoG queda vacío si no se reconoce, o podrías decidir uno por defecto
    }

    const gpcCategoryCode = typeof data.brick === 'string'
      ? (data.brick ?? '').toString().trim()
      : (data.brick?.brick ?? '').toString().trim();

    const unitCode = typeof data.unidad === 'string'
      ? (data.unidad ?? '').toString().trim()
      : (data.unidad?.net_content_uom ?? '').toString().trim();

    const prefijoRaw = (data.prefijo ?? '').toString().trim();

    const vjson = [{
      gtin: codigobar,
      gtinStatus: 'ACTIVE',
      gpcCategoryCode: gpcCategoryCode,
      licenceKey: '786' + prefijoRaw, // ✅ sin espacios
      licenceType: tipoG,
      brandName: [{
        language: 'es',
        value: (data.marca ?? '').toString().trim()
      }],
      productDescription: [{
        language: 'es',
        value: (data.descripcion ?? '').toString().trim()
      }],
      productImageUrl: data.url ? [{
        language: 'es',
        value: data.url.toString().trim()
      }] : [],
      netContent: [{
        unitCode: unitCode,
        value: (data.contenido ?? '').toString().trim()
      }],
      countryOfSaleCode: ['EC']
    }];

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
