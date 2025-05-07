import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface EstadoEmpresa {
  id: number;
  Nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class EstadoEmpresaService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/EstadoEmpresa/`;

  constructor(private http: HttpClient) {}

  obtenerEstadosEmpresa(): Observable<EstadoEmpresa[]> {
    debugger
    return this.http.get<any>(this.apiUrl).pipe(
      map(response =>
        response.data.map((item: any) => ({
          id: item.id,
          Nombre: item.Nombre
        }))
      )
    );
  }
}
