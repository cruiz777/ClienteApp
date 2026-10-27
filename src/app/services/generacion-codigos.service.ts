import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SecuenciaRequest {
  prefijo: string;
  pais?: string; // opcional
}

export interface SecuenciaResponse {
  id: string;
  type: string;
  data: number;
  message: string;
  count: number | null;
}

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeneracionCodigosService {
  private baseUrl = environment.invoicesUrl; // Asegúrate que esté definido en environment.ts

  constructor(private http: HttpClient) { }

  // Llama al backend para obtener el último valor secuencial (resto)
  getUltimoRestoPorPrefijo(prefijo: string): Observable<number> {
    const url = `${this.baseUrl}/producto/ultimo-resto/${prefijo}`;
    return this.http.get<{ numerover: number }>(url).pipe(
      map(res => res?.numerover ?? 0)
    );
  }
  getUltimoRestoPresentacion(codpre: string, codbar: string, inicio: number, largo: number, longitudCodbar: number): Observable<ApiResponse<number>> {
    const params = new HttpParams()
      .set('codpre', codpre)
      .set('codbarPrefix', codbar)
      .set('inicio', inicio.toString())
      .set('largo', largo.toString())
      .set('longitudCodbar', longitudCodbar.toString());

    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/Producto/ultimo-resto-presentacion`, { params });
  }


  // Genera el código EAN-13 completo en base al prefijo y el secuencial
  generarCodigo13(prefijo: string, resto: number): string {
    const Pais = '786';
    const longitud = prefijo.length;
    let pro = '';
    const lresto = resto.toString().length;

    if (longitud === 5) {
      pro = resto.toString().padStart(4, '0');
    } else if (longitud === 6) {
      pro = resto.toString().padStart(3, '0');
    } else if (longitud === 7) {
      pro = resto.toString().padStart(2, '0');
    } else if (longitud === 8) {
      pro = resto.toString();
    } else {
      throw new Error('Prefijo con longitud no válida');
    }

    const EAN = Pais + prefijo + pro;

    let iSum = 0;
    for (let i = 0; i < EAN.length; i++) {
      const digit = +EAN[i];
      iSum += (i % 2 === EAN.length % 2) ? digit : digit * 3;
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    return EAN + iCheckSum.toString();
  }

  generarCodigo8(prefijo: string): string {
    debugger
    const pais = '786';
    let ean = pais + prefijo;
    let suma = 0;
    let digito: number;

    for (let i = 0; i < ean.length; i++) {
      digito = parseInt(ean[i], 10);

      if (isNaN(digito)) {
        throw new Error(`Carácter no numérico encontrado en EAN: '${ean[i]}'`);
      }

      if ((ean.length % 2 === 0 && i % 2 === 0) || (ean.length % 2 !== 0 && i % 2 !== 0)) {
        suma += digito;
      } else {
        suma += digito * 3;
      }
    }

    const checksum = (10 - (suma % 10)) % 10;
    const codigoFinal = ean + checksum.toString();

    return codigoFinal;
  }
  // Versión Angular/TypeScript equivalente a la función VB6 generacion13iiver

  validarYGenerarCodigo13i(baseCodigo: string): string | null {
    const EAN = baseCodigo.trim();
    const ta = EAN.length;

    if (ta !== 12) {
      console.warn("Ingrese solo 12 números");
      return null;
    }

    let iSum = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(EAN.charAt(i), 10);
      if (isNaN(digit)) {
        console.error("Caracter no numérico encontrado en el código");
        return null;
      }

      if ((i + 1) % 2 !== 0) {
        iSum += digit; // posiciones impares
      } else {
        iSum += digit * 3; // posiciones pares
      }
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    const codigoFinal = EAN + iCheckSum.toString();

    return codigoFinal;
  }

  validarYGenerarCodigo8(baseCodigo: string): string | null {
    if (!baseCodigo || baseCodigo.length !== 7) {
      alert("Ingrese solo 7 Números!!!");
      return null;
    }

    let iSum = 0;
    let dg = 0;
    const EAN = baseCodigo.substring(0, 7);

    for (let i = 0; i < EAN.length; i++) {
      const iDigit = parseInt(EAN.charAt(i), 10);
      if (isNaN(iDigit)) {
        alert("Código inválido: debe contener solo números.");
        return null;
      }

      if ((EAN.length % 2 === 0 && (i + 1) % 2 === 0) || (EAN.length % 2 !== 0 && (i + 1) % 2 === 0)) {
        iSum += iDigit;
      } else {
        dg = iDigit * 3;
        iSum += dg;
      }
    }

    const iCheckSum = (10 - (iSum % 10)) % 10;
    const Codigo = EAN + iCheckSum.toString();

    return Codigo;
  }

  validarYGenerarCodigo12(input: string): string | null {
    if (input.length !== 11) {
      alert("Ingrese solo 11 números!!!");
      return null;
    }

    let sum = 0;

    for (let i = 0; i < 11; i++) {
      const digit = parseInt(input.charAt(i), 10);
      // POSICIÓN desde la IZQUIERDA:
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return input + checkDigit.toString();
  }



  generarCodigo12N(prefijo: string, resto: number, longitud: number): string {
    let pro = '';
    const pais = ''; // No se usa para GTIN-12 (UPC-A), así que queda vacío

    // Calcular la parte restante con padding para que prefijo + pro = 11 caracteres
    const longitudTotal = 11;
    const padding = longitudTotal - prefijo.length;

    pro = resto.toString().padStart(padding, '0');

    const ean = prefijo + pro; // 11 dígitos
    let sum = 0;

    for (let i = 0; i < ean.length; i++) {
      const digit = parseInt(ean[i], 10);
      // En GTIN-12 (UPC-A), las posiciones impares (0,2,4...) se multiplican por 3
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return ean + checkDigit.toString(); // 12 dígitos
  }

  private apiBaseUrl = environment.invoicesUrl;

  private apiUrl = this.apiBaseUrl + '/Producto/ultimo-resto';



  obtenerSecuencia(prefijo: string, pais?: string): Observable<SecuenciaResponse> {
    let params = new HttpParams().set('prefijo', prefijo);
    if (pais) {
      params = params.set('pais', pais);
    }

    return this.http.get<SecuenciaResponse>(this.apiUrl, { params });
  }

  private apiUrl1 = this.apiBaseUrl + '/Producto/ultimo-resto-upc';



  obtenerSecuenciaUpc(prefijo: string, pais?: string): Observable<SecuenciaResponse> {
    let params = new HttpParams().set('prefijo', prefijo);
    if (pais) {
      params = params.set('pais', pais);
    }

    return this.http.get<SecuenciaResponse>(this.apiUrl1, { params });
  }


generarCodigo14(pais: string, prefijo: string): string {
  const indicador = (pais ?? '').toString().trim();     // en tus ejemplos: "2" o "4"
  const codigo = (prefijo ?? '').toString().trim();     // GTIN-12 o GTIN-13 (con DV)

  if (!/^\d$/.test(indicador)) {
    throw new Error('Indicador inválido: debe ser 1 dígito numérico (ej: "2" o "4").');
  }
  if (!/^\d+$/.test(codigo) || (codigo.length !== 12 && codigo.length !== 13)) {
    throw new Error('Código inválido: debe tener 12 o 13 dígitos numéricos.');
  }

  // ✅ Construir base de 13 dígitos para GTIN-14 (sin DV-14)
  let base13: string;

  if (codigo.length === 13) {
    // GTIN-13: indicador + (primeros 12, sin DV GTIN-13)
    base13 = indicador + codigo.substring(0, 12);
  } else {
    // GTIN-12: indicador + "0" + (primeros 11, sin DV GTIN-12)
    base13 = indicador + '0' + codigo.substring(0, 11);
  }

  if (base13.length !== 13) {
    throw new Error(`Base inválida: se esperaba 13 dígitos y se obtuvo ${base13.length}. Base=${base13}`);
  }

  // ✅ DV GTIN correcto: pesos desde la derecha 3,1,3,1...
  let suma = 0;
  for (let i = base13.length - 1, pos = 1; i >= 0; i--, pos++) {
    const digito = Number(base13.charAt(i));
    const peso = (pos % 2 === 1) ? 3 : 1;
    suma += digito * peso;
  }

  const dv14 = (10 - (suma % 10)) % 10;
  return base13 + dv14.toString();
}


}
