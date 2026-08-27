import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UmedidaService } from './umedida.service';

@Injectable({
  providedIn: 'root'
})
export class JsonBloqueService {

  private mapaUnidades: Record<string, string> = {};

  constructor(
    private http: HttpClient,
    private umedidaService: UmedidaService
  ) {}

  // Inicializa las unidades para traducir sus códigos.
  public inicializarUnidades(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.umedidaService.obtenerUnidades().subscribe({
        next: (unidades) => {
          this.mapaUnidades = Object.fromEntries(
            unidades.map((unidad) => [
              unidad.unidad,
              unidad.net_content_uom
            ])
          );

          resolve();
        },
        error: (error: unknown) => {
          console.error('❌ Error cargando unidades:', error);
          this.mapaUnidades = {};

          // Continúa aunque no se puedan cargar las unidades.
          resolve();
        }
      });
    });
  }

  // Genera y envía el JSON en lote.
  generarJsonLote(
    filas: any[],
    prefijo: string,
    dapiP: string,
    capiP: string
  ): void {
    const prefijoNormalizado = (prefijo ?? '').toString().trim();

    const vjson = filas.map((data) => {
      let codigobar = '';
      let tipoG = '';

      // Normaliza el GTIN.
      const gtinUv = (data.gtinUv ?? '').toString().trim();
      const longitud = gtinUv.length;

      if (longitud === 13) {
        codigobar = `0${gtinUv}`;
        tipoG = 'GCP';
      } else if (longitud === 12) {
        codigobar = `00${gtinUv}`;
        tipoG = 'GCP';
      } else if (longitud === 8) {
        codigobar = `000000${gtinUv}`;
        tipoG = 'GTIN';
      } else {
        // Conserva el código si ya tiene 14 dígitos
        // o posee una longitud diferente.
        codigobar = gtinUv;
      }

      const gpcCategoryCode = (data.gcpBrick ?? '')
        .toString()
        .trim();

      const unidadKey = (data.contenidoUM ?? '')
        .toString()
        .trim();

      const unidadDescripcion =
        this.mapaUnidades[unidadKey] || unidadKey || '';

      const urlFoto = (data.urlFoto ?? '')
        .toString()
        .trim();

      return {
        gtin: codigobar,
        gtinStatus: 'ACTIVE',
        gpcCategoryCode,
        licenceKey: `786${prefijoNormalizado}`,
        licenceType: tipoG,

        brandName: [
          {
            language: 'es',
            value: (data.marca ?? '').toString().trim()
          }
        ],

        productDescription: [
          {
            language: 'es',
            value: (data.descripcion ?? '').toString().trim()
          }
        ],

        productImageUrl: urlFoto
          ? [
              {
                language: 'es',
                value: urlFoto
              }
            ]
          : [],

        netContent: [
          {
            unitCode: unidadDescripcion,
            value: (data.contenidoNeto ?? '').toString().trim()
          }
        ],

        countryOfSaleCode: ['EC']
      };
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      APIKey: (capiP ?? '').toString().trim()
    });

    const urlApi = (dapiP ?? '').toString().trim();

    this.http.post(urlApi, vjson, { headers }).subscribe({
      next: (response: unknown) => {
        console.log('✅ Lote enviado correctamente a Verified:', response);
      },
      error: (error: unknown) => {
        console.error('❌ Error al enviar el JSON del lote:', error);
      }
    });
  }
}

// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { UmedidaService } from './umedida.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class JsonBloqueService {

//   private mapaUnidades: { [clave: string]: string } = {};

//   constructor(
//     private http: HttpClient,
//     private umedidaService: UmedidaService
//   ) {}

//   // ✅ Inicializa unidades (para traducir "g" a "gramos", etc.)
//   public inicializarUnidades(): Promise<void> {
//     return new Promise((resolve) => {
//       this.umedidaService.obtenerUnidades().subscribe({
//         next: unidades => {
//           this.mapaUnidades = Object.fromEntries(unidades.map(u => [u.unidad, u.net_content_uom]));
//           resolve();
//         },
//         error: err => {
//           console.error('❌ Error cargando unidades:', err);
//           this.mapaUnidades = {};
//           resolve(); // continúa sin fallar
//         }
//       });
//     });
//   }

//   // ✅ Método para generar JSON en lote
//   generarJsonLote(filas: any[], prefijo: string, dapiP: string, capiP: string): void {
//     const vjson = filas.map(data => {
//       let codigobar = '';
//       let tipoG = '';

//       // ✅ NORMALIZA GTIN: string + trim (evita “faltó un cero” por espacios o tipos)
//       const gtinUv = (data.gtinUv ?? '').toString().trim();
//       const len = gtinUv.length;

//       if (len === 13) {
//         codigobar = '0' + gtinUv;      // ✅ aquí sí va el cero
//         tipoG = 'GCP';
//       } else if (len === 12) {
//         codigobar = '00' + gtinUv;
//         tipoG = 'GCP';
//       } else if (len === 8) {
//         codigobar = '000000' + gtinUv;
//         tipoG = 'GTIN';
//       } else {
//         // Si llega 14 ya armado, o llega vacío/incorrecto, lo mandas tal cual o lo dejas vacío
//         codigobar = gtinUv;
//       }

//       const gpcCategoryCode = (data.gcpBrick ?? '').toString().trim();
//       const unidadKey = (data.contenidoUM ?? '').toString().trim();
//       const unidadDescripcion = this.mapaUnidades[unidadKey] || unidadKey || '';

//       return {
//         gtin: codigobar,
//         gtinStatus: 'ACTIVE',
//         gpcCategoryCode: gpcCategoryCode,
//         licenceKey: '786' + (prefijo ?? '').toString().trim(),
//         licenceType: tipoG,
//         brandName: [{
//           language: 'es',
//           value: (data.marca ?? '').toString().trim()
//         }],
//         productDescription: [{
//           language: 'es',
//           value: (data.descripcion ?? '').toString().trim()
//         }],
//         productImageUrl: (data.urlFoto ?? '').toString().trim()
//           ? [{
//               language: 'es',
//               value: (data.urlFoto ?? '').toString().trim()
//             }]
//           : [],
//         netContent: [{
//           unitCode: unidadDescripcion,
//           value: (data.contenidoNeto ?? '').toString().trim()
//         }],
//         countryOfSaleCode: ['EC']
//       };
//     });

//     const headers = new HttpHeaders({
//       'Content-Type': 'application/json',
//       'APIKey': capiP
//     });

//     this.http.post(dapiP, vjson, { headers }).subscribe({
//       next: (response: any) => {
//         console.log('✅ Enviado lote a Verified:', response);
//         // this.guardarArchivo(vjson);
//       },
//       error: (error) => {
//         console.error('❌ Error al enviar JSON de lote:', error);
//         this.guardarArchivo(vjson); // Guarda igual aunque falle
//       }
//     });
//   }

//   // ✅ Guardar el archivo localmente
//   private guardarArchivo(jsonData: any) {
//     const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
//     const filename = `786gs1_ec_${new Date().getTime()}.json`;

//     const link = document.createElement('a');
//     link.href = window.URL.createObjectURL(blob);
//     link.download = filename;
//     link.click();
//   }
// }
