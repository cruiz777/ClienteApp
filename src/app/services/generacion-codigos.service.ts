// Servicio Angular que incluye el llamado al backend y la generación del código EAN-13

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeneracionCodigosService {
  private baseUrl = environment.invoicesUrl; // Asegúrate que esté definido en environment.ts

  constructor(private http: HttpClient) {}

  // Llama al backend para obtener el último valor secuencial (resto)
  getUltimoRestoPorPrefijo(prefijo: string): Observable<number> {
    const url = `${this.baseUrl}/producto/ultimo-resto/${prefijo}`;
    return this.http.get<{ numerover: number }>(url).pipe(
      map(res => res?.numerover ?? 0)
    );
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
    alert("Ingrese solo 11 Números!!!");
    return null;
  }

  let iSum = 0;
  let iDigit = 0;
  let dg = 0;
  const EAN = input.substring(0, 11);

  const isEvenLength = EAN.length % 2 === 0;

  for (let i = 0; i < EAN.length; i++) {
    iDigit = parseInt(EAN.charAt(i), 10);

    if ((i + 1) % 2 === (isEvenLength ? 0 : 1)) {
      iSum += iDigit;
    } else {
      dg = iDigit * 3;
      iSum += dg;
    }
  }

  const iCheckSum = (10 - (iSum % 10)) % 10;
  const codigoFinal = EAN + iCheckSum.toString();
  return codigoFinal;
}

generarCodigo12N(prefijo: string, resto: number, longitud: number): string {
  let pro = '';
  const pais = ''; // Puedes ajustar esto si necesitas incluir un prefijo de país

  const restoStr = resto.toString();
  const lresto = restoStr.length;

  // Padding basado en la longitud esperada
  if (longitud === 6) {
    pro = resto.toString().padStart(5, '0');
  } else if (longitud === 7) {
    pro = resto.toString().padStart(4, '0');
  } else if (longitud === 8) {
    pro = resto.toString().padStart(3, '0');
  } else if (longitud === 9) {
    pro = resto.toString().padStart(2, '0');
  } else if (longitud === 10) {
    pro = resto.toString();
  }

  const ean = pais + prefijo + pro;

  let iSum = 0;
  for (let i = 0; i < ean.length; i++) {
    const digit = parseInt(ean[i], 10);
    if (ean.length % 2 === 0) {
      iSum += (i % 2 === 0) ? digit : digit * 3;
    } else {
      iSum += (i % 2 === 0) ? digit * 3 : digit;
    }
  }

  const iCheckSum = (10 - (iSum % 10)) % 10;
  const codigoFinal = ean + iCheckSum.toString();

  return codigoFinal;
}


}
