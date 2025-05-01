import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Zona {
  id: number;
  referencia:string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZonaService {
  private apiBaseUrl = environment.applicationUrl;
  private apiUrl = `${this.apiBaseUrl}/Zona/`;
  constructor(private http: HttpClient) {}

  obtenerZona(): Observable<Zona[]> {
    debugger
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data.map((item: any) => ({
        id: item.id,
        referencia:item.referencia,
        nombre: item.nombre
      })))
    );
  }
}
