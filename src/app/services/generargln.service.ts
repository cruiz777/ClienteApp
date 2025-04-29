import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GenerarglnService {

  private pais = '786';

  constructor() { }

  /**
   * Método principal para generar GLN
   */
  generarGln(N: number, prefi: string): string[] {
    const codigos: string[] = [];

    // Primera generación
    let pro = this.obtenerProDefault(N);
    let ean = this.pais + prefi + pro;
    let codigo = this.generarCodigoEAN(ean);
    codigos.push(codigo);

    // Segunda generación si corresponde (N entre 6-10)
    if (N >= 6 && N <= 10) {
      pro = this.obtenerProCompleto(N);
      ean = '0' + prefi + pro;
      codigo = this.generarCodigoEAN(ean);
      codigos.push(codigo);
    }

    return codigos;
  }

  /**
   * Obtiene el "pro" inicial para la primera generación
   */
  private obtenerProDefault(N: number): string {
    switch (N) {
      case 5: return '0000';
      case 6: return '000';
      case 7: return '00';
      case 8: return '0';
      default: return '';
    }
  }

  /**
   * Obtiene el "pro" para segunda generación (para N entre 6 y 10)
   */
  private obtenerProCompleto(N: number): string {
    switch (N) {
      case 6: return '00000';
      case 7: return '0000';
      case 8: return '000';
      case 9: return '00';
      case 10: return '0';
      default: return '';
    }
  }

  /**
   * Calcula el GLN completo con dígito verificador
   */
  private generarCodigoEAN(ean: string): string {
    let suma = 0;
    const longitudPar = ean.length % 2 === 0;

    for (let i = 0; i < ean.length; i++) {
      const digito = parseInt(ean[i], 10);

      if (longitudPar) {
        suma += (i % 2 === 0) ? digito : digito * 3;
      } else {
        suma += (i % 2 === 0) ? digito * 3 : digito;
      }
    }

    const checkSum = (10 - (suma % 10)) % 10;
    return ean + checkSum.toString();
  }
}
