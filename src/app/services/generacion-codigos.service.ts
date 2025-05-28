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
}
