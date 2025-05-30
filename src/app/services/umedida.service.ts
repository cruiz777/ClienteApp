import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface Umedida {
  codigo: number;
  descripcion: string;
  unidad: string;
  net_content_uom: string;
  estado: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class UmedidaService {
  private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) {}

  obtenerUnidades(): Observable<Umedida[]> {
    
    return this.http.get<{ data: Umedida[] }>(`${this.apiBaseUrl}/UnidadMedida`).pipe(
      map(response => response.data)
    );
  }
}
