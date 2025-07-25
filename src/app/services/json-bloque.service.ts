import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UmedidaService } from './umedida.service';

@Injectable({
  providedIn: 'root'
})
export class JsonBloqueService {

  private mapaUnidades: { [clave: string]: string } = {};

  constructor(
    private http: HttpClient,
    private umedidaService: UmedidaService
  ) {}

  // ✅ Inicializa unidades (para traducir "g" a "gramos", etc.)
  public inicializarUnidades(): Promise<void> {
    return new Promise((resolve) => {
      this.umedidaService.obtenerUnidades().subscribe({
        next: unidades => {
          this.mapaUnidades = Object.fromEntries(unidades.map(u => [u.unidad, u.net_content_uom]));
          resolve();
        },
        error: err => {
          console.error('❌ Error cargando unidades:', err);
          this.mapaUnidades = {};
          resolve(); // continúa sin fallar
        }
      });
    });
  }

  // ✅ Método para generar JSON en lote
  generarJsonLote(filas: any[], prefijo: string, dapiP: string, capiP: string): void {
    const vjson = filas.map(data => {
      let codigobar = '';
      let tipoG = '';

      const len = data.gtinUv.length;
      if (len === 13) {
        codigobar = '0' + data.gtinUv;
        tipoG = 'GCP';
      } else if (len === 12) {
        codigobar = '00' + data.gtinUv;
        tipoG = 'GCP';
      } else if (len === 8) {
        codigobar = '000000' + data.gtinUv;
        tipoG = 'GTIN';
      }

      const gpcCategoryCode = data.gcpBrick || '';
      const unidadDescripcion = this.mapaUnidades[data.contenidoUM] || data.contenidoUM || '';

      return {
        gtin: codigobar,
        gtinStatus: 'ACTIVE',
        gpcCategoryCode: gpcCategoryCode,
        licenceKey: '786' + prefijo,
        licenceType: tipoG,
        brandName: [{
          language: 'es',
          value: data.marca
        }],
        productDescription: [{
          language: 'es',
          value: data.descripcion
        }],
        productImageUrl: data.urlFoto ? [{
          language: 'es',
          value: data.urlFoto
        }] : [],
        netContent: [{
          unitCode: unidadDescripcion,
          value: data.contenidoNeto
        }],
        countryOfSaleCode: ['EC']
      };
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'APIKey': capiP
    });

    this.http.post(dapiP, vjson, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ Enviado lote a Verified:', response);
        //this.guardarArchivo(vjson);
      },
      error: (error) => {
        console.error('❌ Error al enviar JSON de lote:', error);
        this.guardarArchivo(vjson); // Guarda igual aunque falle
      }
    });
  }

  // ✅ Guardar el archivo localmente
  private guardarArchivo(jsonData: any) {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const filename = `786gs1_ec_${new Date().getTime()}.json`;

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}
