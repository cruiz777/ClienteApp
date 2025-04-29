import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { environment } from 'src/environments/environment';

export interface Prefijo {
  id_prefijos: number;
  codpre: string;
  clientesCodigo: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrefijoService {

  private apiBaseUrl = environment.applicationUrl;

  // ✅ Inyección de HttpClient
  constructor(private http: HttpClient) {}

  guardarPrefijo(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Prefijos`, data);
  }

  buscarPorCodpre(codpre: string): Observable<Prefijo[]> {
    const url = `${this.apiBaseUrl}/Codpre?Codpre=${encodeURIComponent(codpre)}`;
    return this.http.get<any>(url).pipe(
      map(res => res.data as Prefijo[]) // Asegura que devuelva solo el array de datos
    );
  }


}
