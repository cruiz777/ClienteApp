import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GenerarPresentacionesService {

  constructor() {}

  generarCodigo12IPresentacion(prefijo: string, secuencia: number): string {
    const largoPrefijo = prefijo.length;
    const restoStr = secuencia.toString();
    let pro = '';

    // Map de cantidad total de dígitos que debe tener el "resto"
    const paddingMap: { [key: number]: number } = {
      6: 4,  // total codbar será 12 → 6 + 4 + 1 (dígito verificador)
      7: 3,
      8: 2,
      9: 1
    };

    const largoEsperado = paddingMap[largoPrefijo];
    if (!largoEsperado) {
      throw new Error(`Prefijo de longitud no soportada: ${largoPrefijo}`);
    }

    pro = restoStr.padStart(largoEsperado, '0');
    const ean = `${prefijo}${pro}`;

    // Calcular dígito verificador
    let suma = 0;
    const digits = ean.split('').map(Number);

    for (let i = 0; i < digits.length; i++) {
      const position = i + 1; // 1-based
      const multiplicador = (ean.length % 2 === 0)
        ? (position % 2 !== 0 ? 1 : 3)
        : (position % 2 === 0 ? 1 : 3);
      suma += digits[i] * multiplicador;
    }

    const digitoVerificador = (10 - (suma % 10)) % 10;
    return ean + digitoVerificador;
  }


///import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

generarCodigoEAN13Completo(N: number, pais: string, prefi: string, resto: number): string {
  const lresto = resto.toString().length;
  let pro = '';

  // Formateo de 'resto' con ceros a la izquierda
  if (N === 5) {
    switch (lresto) {
      case 1: pro = '000' + resto; break;
      case 2: pro = '00' + resto; break;
      case 3: pro = '0' + resto; break;
      case 4: pro = '' + resto; break;
    }
  } else if (N === 6) {
    switch (lresto) {
      case 1: pro = '00' + resto; break;
      case 2: pro = '0' + resto; break;
      case 3: pro = '' + resto; break;
    }
  } else if (N === 7) {
    switch (lresto) {
      case 1: pro = '0' + resto; break;
      case 2: pro = '' + resto; break;
    }
  } else if (N === 8) {
    pro = '' + resto;
  } else {
    console.error('N inválido:', N);
    return '';
  }

  const ean = pais + prefi + pro;

  // Calcular dígito verificador EAN-13
  let iSum = 0;
  for (let i = 0; i < ean.length; i++) {
    const iDigit = parseInt(ean[i], 10);
    if ((ean.length % 2 === 0 && (i + 1) % 2 !== 0) || (ean.length % 2 !== 0 && (i + 1) % 2 === 0)) {
      iSum += iDigit;
    } else {
      iSum += iDigit * 3;
    }
  }

  const iCheckSum = (10 - (iSum % 10)) % 10;
  const codigo = ean + iCheckSum.toString();

  return codigo;
}



  
}



